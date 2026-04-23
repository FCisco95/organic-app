import { NextRequest, NextResponse } from 'next/server';
import type {
  GetVersionedTransactionConfig,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import {
  ConsensusError,
  compareTxConfirmation,
  getConnection,
  getSolanaConsensus,
} from '@/lib/solana';
import { txSignatureQuerySchema } from '@/features/solana-proxy/schemas';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const fetchOptions: GetVersionedTransactionConfig = {
  maxSupportedTransactionVersion: 0,
  commitment: 'finalized',
};

function summarizeForConsensus(
  tx: ParsedTransactionWithMeta | null
): { slot: number; status: string } | null {
  if (!tx) return null;
  // commitment: 'finalized' was requested, so anything returned is finalized
  // for comparator purposes. Slot carries the real discrimination.
  return { slot: tx.slot, status: 'finalized' };
}

function mapTxStatus(
  tx: ParsedTransactionWithMeta
): 'finalized' | 'failed' | 'unknown' {
  if (tx.meta === null) return 'unknown';
  return tx.meta.err ? 'failed' : 'finalized';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = txSignatureQuerySchema.safeParse({
    signature: request.nextUrl.searchParams.get('signature') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid signature parameter' },
      { status: 400 }
    );
  }

  const { signature } = parsed.data;
  const wantConsensus =
    request.nextUrl.searchParams.get('consensus') === 'true';
  const consensus = wantConsensus ? getSolanaConsensus() : null;

  try {
    let tx: ParsedTransactionWithMeta | null;
    if (consensus) {
      tx = await consensus.verify<ParsedTransactionWithMeta | null>(
        (connection) => connection.getParsedTransaction(signature, fetchOptions),
        {
          label: 'tx-status.proxy',
          compare: (a, b) =>
            compareTxConfirmation(
              summarizeForConsensus(a),
              summarizeForConsensus(b)
            ),
        }
      );
    } else {
      tx = await getConnection().getParsedTransaction(signature, fetchOptions);
    }

    if (!tx) {
      return NextResponse.json(
        { data: { status: 'not_found' }, error: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        data: {
          slot: tx.slot,
          status: mapTxStatus(tx),
          block_time: tx.blockTime ?? null,
        },
        error: null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof ConsensusError) {
      logger.error(
        'tx-status proxy: consensus disagreement',
        { label: err.label, signature },
        err
      );
      return NextResponse.json(
        {
          data: null,
          error:
            'Transaction confirmation is inconsistent across providers. Please retry shortly.',
        },
        { status: 503 }
      );
    }
    logger.error('tx-status proxy: unexpected error', { signature }, err);
    return NextResponse.json(
      { data: null, error: 'Temporarily unavailable' },
      { status: 500 }
    );
  }
}
