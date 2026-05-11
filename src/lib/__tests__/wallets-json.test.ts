import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { z } from 'zod';

const SOLANA_PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const walletEntrySchema = z.object({
  key: z.enum(['dev_wallet', 'lp_raydium', 'community_rewards']),
  address: z.string().regex(SOLANA_PUBKEY).nullable(),
  label: z.string().min(1),
  purpose: z.string().min(1),
});

const walletsJsonSchema = z.object({
  version: z.number().int().positive(),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  network: z.literal('mainnet-beta'),
  token: z.object({
    mint: z.string().regex(SOLANA_PUBKEY),
    symbol: z.string().min(1),
    decimals: z.number().int().nonnegative(),
    total_supply: z.string().regex(/^\d+$/),
  }),
  wallets: z.array(walletEntrySchema).length(3),
  notes: z.string(),
  source: z.string().url(),
});

const fileContents = readFileSync(
  path.join(process.cwd(), 'public', 'wallets.json'),
  'utf8',
);

test('public/wallets.json is valid JSON', () => {
  assert.doesNotThrow(() => JSON.parse(fileContents));
});

test('public/wallets.json matches the published schema', () => {
  const parsed = JSON.parse(fileContents);
  const result = walletsJsonSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `wallets.json schema mismatch:\n${JSON.stringify(result.error.format(), null, 2)}`,
    );
  }

  assert.equal(result.success, true);
});

test('public/wallets.json contains the three required wallet keys', () => {
  const parsed = JSON.parse(fileContents) as { wallets: { key: string }[] };
  const keys = parsed.wallets.map((w) => w.key).sort();
  assert.deepEqual(keys, ['community_rewards', 'dev_wallet', 'lp_raydium']);
});
