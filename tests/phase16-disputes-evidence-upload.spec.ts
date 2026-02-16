import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type QaUser = {
  id: string;
  email: string;
  password: string;
};

type JsonRecord = Record<string, unknown>;

type ApiResult = {
  status: number;
  ok: boolean;
  json: unknown;
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const KEEP_FIXTURES = process.env.PHASE16_QA_KEEP_FIXTURES === 'true';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown, key: string): string | null {
  if (!isObject(value)) return null;
  const raw = value[key];
  return typeof raw === 'string' ? raw : null;
}

async function waitForProfile(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for user_profiles row: ${userId}`);
}

async function createQaUser(
  supabaseAdmin: SupabaseClient,
  input: {
    email: string;
    password: string;
    role: 'admin' | 'member';
    organicId: number;
    name: string;
    xp: number;
  }
): Promise<QaUser> {
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    });

  if (createError) throw createError;
  if (!created.user?.id) throw new Error(`No user id returned for ${input.email}`);

  await waitForProfile(supabaseAdmin, created.user.id);

  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      role: input.role,
      organic_id: input.organicId,
      name: input.name,
      xp_total: input.xp,
    })
    .eq('id', created.user.id);

  if (updateError) throw updateError;

  return {
    id: created.user.id,
    email: input.email,
    password: input.password,
  };
}

async function buildSessionCookie(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<string> {
  const storage: Record<string, string> = {};

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const authEntry = Object.entries(storage).find(([key]) => key.includes('-auth-token'));
  if (!authEntry) throw new Error(`No auth token stored after sign-in: ${email}`);

  const [cookieName, rawValue] = authEntry;
  const encoded = `base64-${toBase64Url(rawValue)}`;
  return `${cookieName}=${encoded}`;
}

async function apiJsonRequest(
  cookie: string,
  method: 'GET' | 'POST',
  path: string,
  body?: JsonRecord
): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let json: unknown = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = raw || null;
  }

  return { status: response.status, ok: response.ok, json };
}

async function apiUploadRequest(cookie: string, file: Blob, fileName: string): Promise<ApiResult> {
  const formData = new FormData();
  formData.append('file', file, fileName);

  const response = await fetch(`${BASE_URL}/api/disputes/evidence`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
    },
    body: formData,
  });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { status: response.status, ok: response.ok, json };
}

test.describe('Phase 16 dispute evidence upload', () => {
  test.describe.configure({ mode: 'serial' });

  test('uploads evidence file and exposes signed detail link', async () => {
    test.setTimeout(180_000);

    const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = `qa${Date.now()}`;
    const pass = 'Phase16!Pass123';
    const baseOrganic = Math.floor(100000000 + Math.random() * 800000000);

    const createdUserIds: string[] = [];
    const createdTaskIds: string[] = [];
    const createdSubmissionIds: string[] = [];
    const createdDisputeIds: string[] = [];
    const uploadedStoragePaths: string[] = [];

    try {
      const admin = await createQaUser(supabaseAdmin, {
        email: `${runId}.admin@example.com`,
        password: pass,
        role: 'admin',
        organicId: baseOrganic + 1,
        name: 'Evidence Admin',
        xp: 1000,
      });
      const reviewer = await createQaUser(supabaseAdmin, {
        email: `${runId}.reviewer@example.com`,
        password: pass,
        role: 'member',
        organicId: baseOrganic + 2,
        name: 'Evidence Reviewer',
        xp: 1000,
      });
      const disputant = await createQaUser(supabaseAdmin, {
        email: `${runId}.member@example.com`,
        password: pass,
        role: 'member',
        organicId: baseOrganic + 3,
        name: 'Evidence Member',
        xp: 1000,
      });
      createdUserIds.push(admin.id, reviewer.id, disputant.id);

      const { data: tasks, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert({
          title: `[${runId}] Evidence upload fixture task`,
          description: 'Fixture for dispute evidence upload',
          created_by: admin.id,
          task_type: 'development',
          status: 'backlog',
          base_points: 100,
          priority: 'medium',
        })
        .select('id')
        .single();

      expect(taskError).toBeNull();
      if (!tasks?.id) throw new Error('Failed to create fixture task');
      createdTaskIds.push(tasks.id);

      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('task_submissions')
        .insert({
          task_id: tasks.id,
          user_id: disputant.id,
          submission_type: 'development',
          pr_link: 'https://github.com/example/repo/pull/5001',
          description: 'Evidence upload fixture submission',
          review_status: 'rejected',
          reviewer_id: reviewer.id,
          rejection_reason: 'Fixture rejection',
          reviewer_notes: 'Fixture notes',
        })
        .select('id')
        .single();

      expect(submissionError).toBeNull();
      if (!submission?.id) throw new Error('Failed to create fixture submission');
      createdSubmissionIds.push(submission.id);

      const disputantCookie = await buildSessionCookie(
        supabaseUrl,
        anonKey,
        disputant.email,
        disputant.password
      );

      const blob = new Blob(['phase16 dispute evidence fixture'], {
        type: 'text/plain',
      });
      const uploadResult = await apiUploadRequest(disputantCookie, blob, 'evidence.txt');
      expect(uploadResult.status).toBe(200);
      expect(uploadResult.ok).toBe(true);

      const uploadData = isObject(uploadResult.json) ? uploadResult.json.data : null;
      const uploadedPath = getString(uploadData, 'path');
      expect(uploadedPath).toBeTruthy();
      if (!uploadedPath) throw new Error('Upload path missing from response');
      uploadedStoragePaths.push(uploadedPath);

      const createDisputeResult = await apiJsonRequest(
        disputantCookie,
        'POST',
        '/api/disputes',
        {
          submission_id: submission.id,
          reason: 'rejected_unfairly',
          evidence_text:
            'Upload fixture: reviewer notes did not match acceptance criteria and proof.',
          evidence_links: [],
          evidence_files: [uploadedPath],
          request_mediation: false,
        }
      );
      expect(createDisputeResult.status).toBe(201);
      expect(createDisputeResult.ok).toBe(true);

      const createdDispute =
        isObject(createDisputeResult.json) && isObject(createDisputeResult.json.data)
          ? createDisputeResult.json.data
          : null;
      const disputeId = getString(createdDispute, 'id');
      expect(disputeId).toBeTruthy();
      if (!disputeId) throw new Error('Dispute id missing after creation');
      createdDisputeIds.push(disputeId);

      const detailResult = await apiJsonRequest(
        disputantCookie,
        'GET',
        `/api/disputes/${disputeId}`
      );
      expect(detailResult.status, JSON.stringify(detailResult.json)).toBe(200);
      expect(detailResult.ok).toBe(true);

      const detailData =
        isObject(detailResult.json) && isObject(detailResult.json.data)
          ? detailResult.json.data
          : null;
      expect(detailData).toBeTruthy();

      const evidenceFiles = Array.isArray(detailData?.evidence_files)
        ? detailData.evidence_files
        : [];
      expect(evidenceFiles).toContain(uploadedPath);

      const evidenceFileUrls = Array.isArray(detailData?.evidence_file_urls)
        ? detailData.evidence_file_urls
        : [];
      expect(evidenceFileUrls.length).toBeGreaterThan(0);

      const firstFile = evidenceFileUrls[0];
      expect(isObject(firstFile)).toBe(true);
      const signedUrl = isObject(firstFile) ? getString(firstFile, 'url') : null;
      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toContain('/storage/v1/object/sign/dispute-evidence/');
    } finally {
      if (!KEEP_FIXTURES) {
        if (uploadedStoragePaths.length > 0) {
          await supabaseAdmin.storage.from('dispute-evidence').remove(uploadedStoragePaths);
        }

        for (const disputeId of createdDisputeIds) {
          await supabaseAdmin.from('disputes').delete().eq('id', disputeId);
        }

        for (const submissionId of createdSubmissionIds) {
          await supabaseAdmin.from('task_submissions').delete().eq('id', submissionId);
        }

        for (const taskId of createdTaskIds) {
          await supabaseAdmin.from('tasks').delete().eq('id', taskId);
        }

        for (const userId of createdUserIds) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      }
    }
  });
});
