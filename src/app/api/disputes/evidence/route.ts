import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disputeEvidenceUploadMetadataSchema } from '@/features/disputes/schemas';
import { classifyEvidenceTimeliness, isDisputeWindowClosed } from '@/features/disputes/sla';
import { logger } from '@/lib/logger';

const EVIDENCE_BUCKET = 'dispute-evidence';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_EVIDENCE_FILES = 5;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
]);
const TERMINAL_DISPUTE_STATUSES = ['resolved', 'dismissed', 'withdrawn', 'mediated'];

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return normalized.slice(0, 120) || 'evidence_file';
}

async function cleanupUploadedFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string
) {
  try {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
  } catch (error) {
    logger.warn('Failed to clean up uploaded dispute evidence file', {
      storagePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const disputeIdValue = formData.get('dispute_id');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PNG, JPG, PDF' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Invalid file size. Maximum is 10MB.' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeFileName(file.name);
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const rawDisputeId =
      typeof disputeIdValue === 'string' && disputeIdValue.trim().length > 0
        ? disputeIdValue.trim()
        : undefined;

    const parsedMetadata = disputeEvidenceUploadMetadataSchema.safeParse({
      dispute_id: rawDisputeId,
    });

    if (!parsedMetadata.success) {
      await cleanupUploadedFile(supabase, storagePath);
      return NextResponse.json({ error: 'Invalid dispute ID' }, { status: 400 });
    }

    const disputeId = parsedMetadata.data.dispute_id;
    if (!disputeId) {
      return NextResponse.json({
        data: {
          path: storagePath,
          name: file.name,
          mime_type: file.type,
          size: file.size,
        },
      });
    }

    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(
        'id, status, sprint_id, response_deadline, disputant_id, reviewer_id, arbitrator_id, evidence_files'
      )
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      await cleanupUploadedFile(supabase, storagePath);
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isParty =
      user.id === dispute.disputant_id ||
      user.id === dispute.reviewer_id ||
      user.id === dispute.arbitrator_id;
    const isPrivileged = profile?.role === 'admin' || profile?.role === 'council';

    if (!isParty && !isPrivileged) {
      await cleanupUploadedFile(supabase, storagePath);
      return NextResponse.json(
        { error: 'Only dispute parties can upload dispute evidence' },
        { status: 403 }
      );
    }

    if (TERMINAL_DISPUTE_STATUSES.includes(dispute.status)) {
      await cleanupUploadedFile(supabase, storagePath);
      return NextResponse.json(
        { error: 'Cannot upload evidence to a closed dispute' },
        { status: 409 }
      );
    }

    if (dispute.sprint_id) {
      const { data: sprint } = await supabase
        .from('sprints')
        .select('dispute_window_ends_at')
        .eq('id', dispute.sprint_id)
        .maybeSingle();

      if (isDisputeWindowClosed(sprint?.dispute_window_ends_at)) {
        await cleanupUploadedFile(supabase, storagePath);
        return NextResponse.json(
          {
            error: 'Dispute window is closed for this sprint',
            dispute_window_ends_at: sprint?.dispute_window_ends_at ?? null,
          },
          { status: 409 }
        );
      }
    }

    const existingEvidenceFiles = Array.isArray(dispute.evidence_files) ? dispute.evidence_files : [];
    const { data: evidenceEventRows, error: eventListError } = await supabase
      .from('dispute_evidence_events')
      .select('storage_path')
      .eq('dispute_id', disputeId);

    if (eventListError) {
      await cleanupUploadedFile(supabase, storagePath);
      throw eventListError;
    }

    const uniqueEvidencePaths = new Set([
      ...existingEvidenceFiles,
      ...(evidenceEventRows ?? []).map((row) => row.storage_path),
    ]);
    if (uniqueEvidencePaths.size >= MAX_EVIDENCE_FILES) {
      await cleanupUploadedFile(supabase, storagePath);
      return NextResponse.json(
        { error: `Maximum ${MAX_EVIDENCE_FILES} evidence files allowed per dispute` },
        { status: 400 }
      );
    }

    const evidenceTiming = classifyEvidenceTimeliness(dispute.response_deadline);

    const { data: evidenceEvent, error: eventError } = await supabase
      .from('dispute_evidence_events')
      .insert({
        dispute_id: disputeId,
        uploaded_by: user.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        is_late: evidenceTiming.isLate,
        late_reason: evidenceTiming.lateReason,
      })
      .select('*')
      .single();

    if (eventError || !evidenceEvent) {
      await cleanupUploadedFile(supabase, storagePath);
      throw eventError;
    }

    const nextEvidenceFiles = Array.from(new Set([...existingEvidenceFiles, storagePath]));
    const { error: evidenceFileUpdateError } = await supabase
      .from('disputes')
      .update({ evidence_files: nextEvidenceFiles })
      .eq('id', disputeId);

    if (evidenceFileUpdateError) {
      logger.warn('Failed to sync disputes.evidence_files after evidence event insert', {
        dispute_id: disputeId,
        storage_path: storagePath,
        error: evidenceFileUpdateError.message,
      });
    }

    return NextResponse.json({
      data: {
        path: storagePath,
        name: file.name,
        mime_type: file.type,
        size: file.size,
        dispute_id: disputeId,
        is_late: evidenceTiming.isLate,
        late_reason: evidenceTiming.lateReason,
        event: evidenceEvent,
      },
    });
  } catch (error) {
    logger.error('Error uploading dispute evidence:', error);
    return NextResponse.json({ error: 'Failed to upload evidence file' }, { status: 500 });
  }
}
