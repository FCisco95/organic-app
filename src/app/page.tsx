'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';

export default function Home() {
  const { user, profile, loading } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-organic-50 via-white to-organic-50">
      <Navigation />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="bg-gradient-to-r from-organic-600 to-organic-800 bg-clip-text text-transparent">Organic</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A community coordination platform for the Organic DAO. Propose ideas, vote on
            decisions, and collaborate on tasks.
          </p>

          {!user && (
            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="bg-gradient-to-r from-organic-600 to-organic-700 hover:from-organic-700 hover:to-organic-800 text-white px-8 py-3 rounded-lg font-medium text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          )}

          {user && !profile?.organic_id && (
            <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 max-w-2xl mx-auto shadow-md">
              <p className="text-lg text-yellow-900 mb-4 font-medium">
                Hold $ORG tokens? Link your wallet and get your Organic ID!
              </p>
              <Link
                href="/profile"
                className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow"
              >
                Go to Profile →
              </Link>
            </div>
          )}

          {user && profile?.organic_id && (
            <div className="mt-8 bg-gradient-to-r from-organic-50 to-emerald-50 border-2 border-organic-300 rounded-xl p-6 max-w-2xl mx-auto shadow-md">
              <p className="text-lg text-organic-900 mb-2 font-medium">
                Welcome back, <strong>Organic #{profile.organic_id}</strong>! 🌱
              </p>
              <div className="flex gap-4 justify-center mt-4">
                <Link
                  href="/proposals"
                  className="bg-gradient-to-r from-organic-600 to-organic-700 hover:from-organic-700 hover:to-organic-800 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow"
                >
                  View Proposals
                </Link>
                <Link
                  href="/tasks"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow"
                >
                  View Tasks
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Proposals</h3>
            <p className="text-gray-600">
              Submit ideas and vote on proposals with token-weighted voting.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tasks</h3>
            <p className="text-gray-600">
              Turn approved proposals into tasks and track progress with sprints.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Organic ID</h3>
            <p className="text-gray-600">
              Token holders get a unique ID and verified member status.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
