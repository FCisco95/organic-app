import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { isMarketplaceEnabled } from '@/config/feature-flags';
import { submitProofSchema } from '@/features/marketplace/schemas';
import { submitEngagementProof } from '@/features/marketplace/marketplace-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: 'Marketplace is not enabled' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitProofSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const result = await submitEngagementProof(supabase, user.id, params.id, parsed.data);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    logger.error('Marketplace engage POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
