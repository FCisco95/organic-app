import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET() {
  // Generate a random nonce for SIWS (Sign-In-With-Solana)
  const nonce = randomBytes(32).toString('base64');

  return NextResponse.json({ nonce });
}
