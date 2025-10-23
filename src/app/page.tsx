'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';

export default function Home() {
  const { user, profile, loading } = useAuth();

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-organic-orange">Organic</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            A community coordination platform for the Organic DAO. Propose ideas, vote on
            decisions, and collaborate on tasks.
          </p>

          {!user && (
            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}

          {user && !profile?.organic_id && (
            <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-base text-gray-800 mb-4 font-medium">
                Hold $ORG tokens? Link your wallet and get your Organic ID!
              </p>
              <Link
                href="/profile"
                className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                Go to Profile →
              </Link>
            </div>
          )}

          {user && profile?.organic_id && (
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-base text-gray-800 mb-2 font-medium">
                Welcome back, <strong>Organic #{profile.organic_id}</strong>!
              </p>
              <div className="flex gap-3 justify-center mt-4 flex-wrap">
                <Link
                  href="/proposals"
                  className="bg-organic-orange hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  View Proposals
                </Link>
                <Link
                  href="/tasks"
                  className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  View Tasks
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Proposals</h3>
            <p className="text-sm text-gray-600">
              Submit ideas and vote on proposals with token-weighted voting.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tasks</h3>
            <p className="text-sm text-gray-600">
              Turn approved proposals into tasks and track progress with sprints.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl mb-3">🎫</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Organic ID</h3>
            <p className="text-sm text-gray-600">
              Token holders get a unique ID and verified member status.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Powered by $ORG
            </h2>
            <p className="text-base text-gray-600 mb-6 max-w-2xl">
              The Organic DAO is a community-driven organization on Solana. Hold $ORG tokens to participate in governance and shape the future.
            </p>
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-gray-700 mb-1">Contract Address</p>
              <p className="font-mono text-xs text-gray-600 break-all">
                {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
