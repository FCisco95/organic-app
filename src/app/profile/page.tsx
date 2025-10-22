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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-organic-yellow/20 via-white to-organic-orange/20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-organic-orange border-t-organic-yellow rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-xl font-comic text-gray-700">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-organic-yellow/20 via-white to-organic-orange/20">
      <Navigation />

      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="bg-white border-4 border-organic-black rounded-2xl shadow-2xl p-8 mb-8 transform hover:scale-105 transition-all duration-200">
          <h1 className="text-5xl font-luckiest text-organic-orange" style={{
            textShadow: '3px 3px 0px rgba(255,122,0,0.2)',
            WebkitTextStroke: '0.5px rgba(255,122,0,0.3)'
          }}>
            MY PROFILE
          </h1>
        </div>

        {/* Profile Info */}
        <div className="bg-white border-4 border-organic-black rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-3xl font-luckiest text-organic-black mb-6" style={{
            textShadow: '2px 2px 0px rgba(255,122,0,0.2)'
          }}>
            ACCOUNT INFO
          </h2>

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-comic font-bold text-gray-700 mb-2">Email</label>
              <p className="text-lg font-comic text-gray-900 bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200">
                {profile.email}
              </p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-comic font-bold text-gray-700 mb-2">Role</label>
              <span className={`inline-flex px-6 py-3 rounded-xl text-base font-comic font-bold border-3 border-organic-black shadow-lg ${
                profile.role === 'admin' ? 'bg-purple-400 text-white' :
                profile.role === 'council' ? 'bg-blue-400 text-white' :
                profile.role === 'member' ? 'bg-green-400 text-white' :
                'bg-gray-300 text-organic-black'
              }`}>
                {profile.role.toUpperCase()}
              </span>
            </div>

            {/* Organic ID */}
            <div>
              <label className="block text-sm font-comic font-bold text-gray-700 mb-2">Organic ID</label>
              {profile.organic_id ? (
                <p className="text-4xl font-luckiest text-organic-orange animate-breathe" style={{
                  textShadow: '2px 2px 0px rgba(255,122,0,0.2)'
                }}>
                  #{profile.organic_id}
                </p>
              ) : (
                <p className="text-lg font-comic text-gray-500 italic">Not assigned yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="bg-white border-4 border-organic-black rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-3xl font-luckiest text-organic-black mb-6" style={{
            textShadow: '2px 2px 0px rgba(255,122,0,0.2)'
          }}>
            SOLANA WALLET
          </h2>

          {/* Wallet Connect Button */}
          <div className="mb-6">
            <WalletMultiButton />
          </div>

          {/* Linked Wallet */}
          {profile.wallet_pubkey && (
            <div className="mb-6">
              <label className="block text-sm font-comic font-bold text-gray-700 mb-2">Linked Wallet</label>
              <div className="bg-gradient-to-r from-organic-yellow/20 to-organic-orange/20 border-3 border-organic-black rounded-xl p-4">
                <p className="text-sm font-mono bg-white p-3 rounded-lg break-all border-2 border-gray-200">
                  {profile.wallet_pubkey}
                </p>
                {tokenBalance !== null && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="bg-gradient-to-r from-organic-orange to-organic-yellow px-6 py-3 rounded-xl border-3 border-organic-black shadow-lg">
                      <p className="text-base font-luckiest text-white" style={{
                        textShadow: '1px 1px 0px rgba(0,0,0,0.3)'
                      }}>
                        $ORG: {tokenBalance.toFixed(2)}
                      </p>
                    </div>
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
              className="w-full bg-gradient-to-r from-organic-orange to-organic-yellow hover:from-organic-yellow hover:to-organic-orange text-white font-luckiest text-lg py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:translate-y-1"
              style={{
                boxShadow: linkingWallet ? 'none' : '0 6px 0 0 #CC6200, 0 10px 15px rgba(0,0,0,0.3)',
                textShadow: '2px 2px 0px rgba(0,0,0,0.2)'
              }}
            >
              {linkingWallet ? 'LINKING...' : 'LINK WALLET'}
            </button>
          )}
        </div>

        {/* Get Organic ID Section */}
        {profile.wallet_pubkey && !profile.organic_id && (
          <div className="bg-gradient-to-r from-organic-yellow to-organic-orange border-4 border-organic-black rounded-2xl shadow-2xl p-8 animate-breathe">
            <h2 className="text-3xl font-luckiest text-white mb-4" style={{
              textShadow: '2px 2px 0px rgba(0,0,0,0.3)',
              WebkitTextStroke: '1px rgba(0,0,0,0.2)'
            }}>
              GET YOUR ORGANIC ID!
            </h2>
            <p className="text-lg font-comic text-white mb-6" style={{
              textShadow: '1px 1px 0px rgba(0,0,0,0.2)'
            }}>
              Hold $ORG tokens? Get your unique Organic ID and become a verified member!
            </p>

            {tokenBalance !== null && tokenBalance > 0 && (
              <div className="bg-green-400 border-3 border-organic-black rounded-xl p-4 mb-6">
                <p className="text-base font-comic font-bold text-white text-center">
                  ✓ You hold {tokenBalance.toFixed(2)} $ORG tokens
                </p>
              </div>
            )}

            <button
              onClick={handleGetOrganicId}
              disabled={gettingOrganicId}
              className="w-full bg-white hover:bg-gray-100 text-organic-orange font-luckiest text-xl py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:translate-y-1 border-3 border-organic-black"
              style={{
                boxShadow: gettingOrganicId ? 'none' : '0 6px 0 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.4)',
                textShadow: '1px 1px 0px rgba(255,122,0,0.2)'
              }}
            >
              {gettingOrganicId ? 'VERIFYING...' : 'GET ORGANIC ID'}
            </button>
          </div>
        )}

        {/* Success Message */}
        {profile.organic_id && (
          <div className="bg-gradient-to-r from-green-300 to-emerald-300 border-4 border-organic-black rounded-2xl shadow-xl p-8 animate-breathe">
            <h3 className="text-3xl font-luckiest text-organic-black mb-4" style={{
              textShadow: '2px 2px 0px rgba(255,255,255,0.5)'
            }}>
              🎉 YOU'RE A VERIFIED MEMBER!
            </h3>
            <p className="text-xl font-comic text-gray-800 leading-relaxed">
              You can now create proposals, vote on decisions, and participate in the Organic DAO community!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
