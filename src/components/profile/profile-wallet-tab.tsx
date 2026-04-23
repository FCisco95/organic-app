'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import bs58 from 'bs58';
import { createClient } from '@/lib/supabase/client';

// Client-side balance cache TTL (15 seconds)
const BALANCE_CACHE_TTL_MS = 15 * 1000;

interface ProfileWalletTabProps {
  profile: {
    wallet_pubkey: string | null;
    organic_id: number | null;
  };
  userId: string;
  refreshProfile: () => Promise<void>;
}

export function ProfileWalletTab({ profile, userId, refreshProfile }: ProfileWalletTabProps) {
  const t = useTranslations('Profile');
  const tWallet = useTranslations('Wallet');
  const router = useRouter();
  const { publicKey, signMessage, connected } = useWallet();

  const balanceCacheRef = useRef<Map<string, { balance: number; ts: number }>>(new Map());
  const balanceRequestRef = useRef<{ controller: AbortController | null; id: number }>({
    controller: null,
    id: 0,
  });

  const [linkingWallet, setLinkingWallet] = useState(false);
  const [gettingOrganicId, setGettingOrganicId] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [walletMismatch, setWalletMismatch] = useState(false);

  const fetchTokenBalance = useCallback(async (walletAddress: string, cacheKey: string) => {
    const cached = balanceCacheRef.current.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < BALANCE_CACHE_TTL_MS) {
      setTokenBalance(cached.balance);
      return;
    }

    balanceRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = balanceRequestRef.current.id + 1;
    balanceRequestRef.current = { controller, id: requestId };

    try {
      const qs = new URLSearchParams({ wallet: walletAddress });
      const response = await fetch(`/api/solana/token-balance?${qs.toString()}`, {
        method: 'GET',
        signal: controller.signal,
      });
      const json = await response.json();
      if (balanceRequestRef.current.id !== requestId) return;
      const balance = typeof json.data?.balance === 'number' ? json.data.balance : 0;
      balanceCacheRef.current.set(cacheKey, { balance, ts: now });
      setTokenBalance(balance);
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error checking balance:', error);
      if (balanceRequestRef.current.id === requestId) {
        setTokenBalance(0);
      }
    }
  }, []);

  useEffect(() => {
    balanceRequestRef.current.controller?.abort();
    if (!connected || !publicKey || !profile.wallet_pubkey) {
      setWalletMismatch(false);
      return () => {
        balanceRequestRef.current.controller?.abort();
      };
    }

    const connectedAddress = publicKey.toBase58();
    const isMismatch = connectedAddress !== profile.wallet_pubkey;
    setWalletMismatch(isMismatch);
    if (isMismatch) {
      setTokenBalance(null);
      return;
    }

    const cacheKey = `${connectedAddress}|${
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'mainnet-beta'
    }`;
    fetchTokenBalance(profile.wallet_pubkey, cacheKey);

    return () => {
      balanceRequestRef.current.controller?.abort();
    };
  }, [connected, publicKey, profile.wallet_pubkey, fetchTokenBalance]);

  const checkTokenBalance = async () => {
    if (!connected || !publicKey || !profile.wallet_pubkey) return;
    const connectedAddress = publicKey.toBase58();
    if (connectedAddress !== profile.wallet_pubkey) return;
    const cacheKey = `${connectedAddress}|${
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'mainnet-beta'
    }`;
    await fetchTokenBalance(profile.wallet_pubkey, cacheKey);
  };

  const handleLinkWallet = async () => {
    if (!publicKey || !signMessage) {
      toast.error(t('toastConnectWallet'));
      return;
    }

    if (!userId) {
      toast.error(t('toastSignInFirst'));
      return;
    }

    setLinkingWallet(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error(t('toastSessionExpired'));
        return;
      }

      const nonceResponse = await fetch('/api/auth/nonce');
      const { nonce } = await nonceResponse.json();

      const appDomain = window.location.host;
      const message = `${appDomain} wants you to sign in with your Solana account.\n\nSign this message to link your wallet to Organic App.\n\nNonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const response = await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: bs58.encode(signature),
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('toastFailedLinkWallet'));
      }

      toast.success(t('toastWalletLinked'));
      await refreshProfile();
      await checkTokenBalance();
      router.refresh();

      setTimeout(async () => {
        await refreshProfile();
      }, 500);
    } catch (error: any) {
      console.error('Error linking wallet:', error);
      toast.error(error.message || t('toastFailedLinkWallet'));
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleGetOrganicId = async () => {
    if (!profile.wallet_pubkey) {
      toast.error(t('toastLinkWalletFirst'));
      return;
    }

    if (!userId) {
      toast.error(t('toastSignInFirst'));
      return;
    }

    setGettingOrganicId(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error(t('toastSessionExpired'));
        return;
      }

      const response = await fetch('/api/organic-id/assign', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign Organic ID');
      }

      toast.success(t('toastOrganicIdAssigned', { id: data.organicId }));
      await refreshProfile();
    } catch (error: any) {
      console.error('Error getting Organic ID:', error);
      toast.error(error.message || t('toastFailedOrganicId'));
    } finally {
      setGettingOrganicId(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Wallet */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('solanaWallet')}</h2>

        <div className="mb-3 text-sm text-muted-foreground">
          {connected && publicKey ? (
            <span>
              {tWallet('connectedWalletLabel')}{' '}
              <span className="font-mono text-foreground">
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </span>
            </span>
          ) : (
            <span>{tWallet('connectWalletFromNav')}</span>
          )}
        </div>

        {walletMismatch && publicKey && profile.wallet_pubkey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-amber-800 mb-0.5">{t('walletMismatchWarning')}</p>
            <p className="text-[11px] text-amber-700">
              {t('walletMismatchDescription', {
                connected: `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`,
                linked: `${profile.wallet_pubkey.slice(0, 4)}...${profile.wallet_pubkey.slice(-4)}`,
              })}
            </p>
          </div>
        )}

        {profile.wallet_pubkey && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('linkedWallet')}</p>
            <div className="bg-muted/30 border border-border rounded-lg p-2.5">
              <p className="text-xs font-mono text-foreground break-all mb-2">
                {profile.wallet_pubkey}
              </p>
              {tokenBalance !== null && connected && publicKey && !walletMismatch && (
                <div className="flex items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">{t('orgBalance')}</span>
                  <span className="text-sm font-bold font-mono text-organic-terracotta">
                    {tokenBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {connected && publicKey && !profile.wallet_pubkey && (
          <button
            onClick={handleLinkWallet}
            disabled={linkingWallet}
            className="w-full bg-cta hover:bg-cta-hover text-cta-fg font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {linkingWallet ? t('linkingWallet') : t('linkWalletToProfile')}
          </button>
        )}
      </div>

      {/* Organic ID assignment */}
      {profile.wallet_pubkey && !profile.organic_id && (
        <div className="rounded-xl border border-organic-terracotta/30 bg-organic-terracotta/5 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">{t('getYourOrganicId')}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t('holdTokensDescription')}</p>

          {tokenBalance !== null &&
            tokenBalance > 0 &&
            connected &&
            publicKey &&
            !walletMismatch && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                <p className="text-xs text-green-700 font-medium">
                  {t('linkedWalletHoldsTokens', { balance: tokenBalance.toFixed(2) })}
                </p>
              </div>
            )}

          <button
            onClick={handleGetOrganicId}
            disabled={gettingOrganicId}
            className="bg-cta hover:bg-cta-hover text-cta-fg font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {gettingOrganicId ? t('verifying') : t('getOrganicId')}
          </button>
        </div>
      )}

      {/* Verified badge */}
      {profile.organic_id && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            {t('verifiedMemberTitle')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('verifiedMemberDescription')}</p>
        </div>
      )}
    </div>
  );
}
