'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Navigation } from '@/components/navigation';
import toast from 'react-hot-toast';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-organic-50 via-white to-organic-50">
      <Navigation />

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-organic-100">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-organic-600 to-organic-800 bg-clip-text text-transparent">
            My Profile
          </h1>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{profile.email}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                profile.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                profile.role === 'council' ? 'bg-blue-100 text-blue-800' :
                profile.role === 'member' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            </div>

            {/* Organic ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organic ID</label>
              {profile.organic_id ? (
                <p className="text-2xl font-bold text-blue-600">#{profile.organic_id}</p>
              ) : (
                <p className="text-gray-500 italic">Not assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Solana Wallet</h2>

          {/* Wallet Connect Button */}
          <div className="mb-4">
            <WalletMultiButton />
          </div>

          {/* Linked Wallet */}
          {profile.wallet_pubkey && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Wallet</label>
              <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all">
                {profile.wallet_pubkey}
              </p>
              {tokenBalance !== null && (
                <p className="text-sm text-gray-600 mt-2">
                  ORG Balance: <span className="font-semibold">{tokenBalance.toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          {/* Link Wallet Button */}
          {connected && publicKey && !profile.wallet_pubkey && (
            <button
              onClick={handleLinkWallet}
              disabled={linkingWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linkingWallet ? 'Linking Wallet...' : 'Link Wallet to Profile'}
            </button>
          )}
        </div>

        {/* Get Organic ID Section */}
        {profile.wallet_pubkey && !profile.organic_id && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Get Your Organic ID</h2>
            <p className="text-gray-600 mb-4">
              Hold $ORG tokens? Get your unique Organic ID and become a verified member!
            </p>

            {tokenBalance !== null && tokenBalance > 0 && (
              <p className="text-sm text-green-600 font-medium mb-4">
                ✓ You hold {tokenBalance.toFixed(2)} $ORG tokens
              </p>
            )}

            <button
              onClick={handleGetOrganicId}
              disabled={gettingOrganicId}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {gettingOrganicId ? 'Verifying...' : 'Get Organic ID'}
            </button>
          </div>
        )}

        {/* Success Message */}
        {profile.organic_id && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              🎉 You're a verified member!
            </h3>
            <p className="text-green-700">
              You can now create proposals, vote on decisions, and participate in the Organic DAO.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
