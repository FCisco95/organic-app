'use client';

import { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import type { Adapter } from '@solana/wallet-adapter-base';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  /**
   * Wallet adapter endpoint. This is the ONLY place server-adjacent code
   * reads NEXT_PUBLIC_SOLANA_RPC_URL — the paid-provider tier URLs
   * (SOLANA_RPC_PRIMARY_URL etc.) handle all server-side Solana calls.
   *
   * Invariant: this URL must be a domain-restricted public key. The
   * wallet adapter uses it for `signAndSendTransaction`, blockhash
   * lookup, and tx submission — operations any visitor's wallet could
   * already perform. Never set this to a paid key without origin
   * restrictions at the provider level.
   */
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
  }, []);

  // Lazy-load heavy wallet adapters (~500KB) — only downloaded after initial render.
  // The provider works immediately with an empty wallets array (Wallet Standard
  // wallets like Phantom are auto-detected). Explicit adapters load async for
  // wallets that need them (Ledger, Torus, TokenPocket, etc).
  const [wallets, setWallets] = useState<Adapter[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('@solana/wallet-adapter-wallets'),
      import('@solana/wallet-adapter-tokenpocket'),
    ]).then(([walletAdapters, tokenpocket]) => {
      if (cancelled) return;
      setWallets([
        new walletAdapters.PhantomWalletAdapter(),
        new walletAdapters.SolflareWalletAdapter(),
        new walletAdapters.CoinbaseWalletAdapter(),
        new walletAdapters.LedgerWalletAdapter(),
        new walletAdapters.TorusWalletAdapter(),
        new tokenpocket.TokenPocketWalletAdapter(),
      ]);
    }).catch(() => {
      // Wallet adapters failed to load — Wallet Standard wallets (Phantom etc.) still work
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
