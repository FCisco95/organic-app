import { NextResponse } from 'next/server';
import { getTokenBalance } from '@/lib/solana';

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const balance = await getTokenBalance(walletAddress);

    return NextResponse.json({ balance });
  } catch (error: any) {
    console.error('Error checking balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check balance' },
      { status: 500 }
    );
  }
}
