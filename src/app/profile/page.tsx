'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Navigation } from '@/components/navigation';
import toast from 'react-hot-toast';
import bs58 from 'bs58';

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { publicKey, signMessage, connected } = useWallet();
  const router = useRouter();
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [gettingOrganicId, setGettingOrganicId] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Check token balance when wallet is connected
  useEffect(() => {
    if (connected && publicKey && profile?.wallet_pubkey) {
      checkTokenBalance();
    }
  }, [connected, publicKey, profile]);

  const checkTokenBalance = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch('/api/organic-id/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      });

      const data = await response.json();
      setTokenBalance(data.balance || 0);
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  };

  const handleLinkWallet = async () => {
    if (!publicKey || !signMessage) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLinkingWallet(true);

    try {
      // Step 1: Get nonce from server
      const nonceResponse = await fetch('/api/auth/nonce');
      const { nonce } = await nonceResponse.json();

      // Step 2: Create message to sign
      const message = `Sign this message to link your wallet to Organic App.\n\nNonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);

      // Step 3: Sign message with wallet
      const signature = await signMessage(encodedMessage);

      // Step 4: Verify signature and link wallet
      const response = await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: bs58.encode(signature),
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link wallet');
      }

      toast.success('Wallet linked successfully!');
      await refreshProfile();
      await checkTokenBalance();
    } catch (error: any) {
      console.error('Error linking wallet:', error);
      toast.error(error.message || 'Failed to link wallet');
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleGetOrganicId = async () => {
    if (!profile?.wallet_pubkey) {
      toast.error('Please link your wallet first');
      return;
    }

    setGettingOrganicId(true);

    try {
      const response = await fetch('/api/organic-id/assign', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign Organic ID');
      }

      toast.success(`Organic ID #${data.organicId} assigned!`);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error getting Organic ID:', error);
      toast.error(error.message || 'Failed to get Organic ID');
    } finally {
      setGettingOrganicId(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account and wallet settings</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
              <p className="text-sm text-gray-900">{profile.email}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Role</label>
              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                profile.role === 'council' ? 'bg-blue-100 text-blue-700' :
                profile.role === 'member' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {profile.role}
              </span>
            </div>

            {/* Organic ID */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Organic ID</label>
              {profile.organic_id ? (
                <p className="text-xl font-bold text-organic-orange">#{profile.organic_id}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Not assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Solana Wallet</h2>

          {/* Wallet Connect Button */}
          <div className="mb-4">
            <WalletMultiButton />
          </div>

          {/* Linked Wallet */}
          {profile.wallet_pubkey && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Linked Wallet</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-mono text-gray-700 break-all mb-3">
                  {profile.wallet_pubkey}
                </p>
                {tokenBalance !== null && (
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 mr-2">$ORG Balance:</span>
                    <span className="text-sm font-semibold text-organic-orange">{tokenBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Link Wallet Button */}
          {connected && publicKey && !profile.wallet_pubkey && (
            <button
              onClick={handleLinkWallet}
              disabled={linkingWallet}
              className="w-full bg-organic-orange hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {linkingWallet ? 'Linking Wallet...' : 'Link Wallet to Profile'}
            </button>
          )}
        </div>

        {/* Get Organic ID Section */}
        {profile.wallet_pubkey && !profile.organic_id && (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Get Your Organic ID</h2>
            <p className="text-sm text-gray-600 mb-4">
              Hold $ORG tokens? Get your unique Organic ID and become a verified member!
            </p>

            {tokenBalance !== null && tokenBalance > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 font-medium">
                  ✓ You hold {tokenBalance.toFixed(2)} $ORG tokens
                </p>
              </div>
            )}

            <button
              onClick={handleGetOrganicId}
              disabled={gettingOrganicId}
              className="bg-organic-orange hover:bg-orange-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {gettingOrganicId ? 'Verifying...' : 'Get Organic ID'}
            </button>
          </div>
        )}

        {/* Success Message */}
        {profile.organic_id && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🎉 You're a verified member!
            </h3>
            <p className="text-sm text-gray-600">
              You can now create proposals, vote on decisions, and participate in the Organic DAO.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
