import { NextRequest, NextResponse } from 'next/server';
import {
  ConsensusError,
  compareBoolean,
  getSolanaConsensus,
  isOrgHolder,
  isOrgHolderUsingConnection,
} from '@/lib/solana';
import { walletQuerySchema } from '@/features/solana-proxy/schemas';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Require auth to prevent holder-enumeration attacks.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const parsed = walletQuerySchema.safeParse({
    wallet: request.nextUrl.searchParams.get('wallet') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid wallet parameter' },
      { status: 400 }
    );
  }

  const { wallet } = parsed.data;
  const consensus = getSolanaConsensus();

  try {
    let isHolder: boolean;
    if (consensus) {
      isHolder = await consensus.verify(
        (connection) => isOrgHolderUsingConnection(wallet, connection),
        { label: 'isOrgHolder.proxy', compare: compareBoolean }
      );
    } else {
      isHolder = await isOrgHolder(wallet, { skipCache: true });
    }
    return NextResponse.json(
      { data: { isHolder }, error: null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof ConsensusError) {
      logger.error(
        'is-holder proxy: consensus disagreement',
        { label: err.label, wallet, userId: user.id },
        err
      );
      return NextResponse.json(
        {
          data: null,
          error:
            'On-chain verification is temporarily inconsistent. Please retry shortly.',
        },
        { status: 503 }
      );
    }
    logger.error(
      'is-holder proxy: unexpected error',
      { wallet, userId: user.id },
      err
    );
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
