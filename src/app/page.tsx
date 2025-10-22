'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/context';

export default function Home() {
  const { user, profile, loading } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Organic</span>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : user ? (
                <>
                  <Link
                    href="/profile"
                    className="text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Profile
                  </Link>
                  {profile?.organic_id && (
                    <>
                      <Link
                        href="/proposals"
                        className="text-gray-700 hover:text-gray-900 font-medium"
                      >
                        Proposals
                      </Link>
                      <Link
                        href="/tasks"
                        className="text-gray-700 hover:text-gray-900 font-medium"
                      >
                        Tasks
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">Organic</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A community coordination platform for the Organic DAO. Propose ideas, vote on
            decisions, and collaborate on tasks.
          </p>

          {!user && (
            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors shadow-lg"
              >
                Get Started
              </Link>
            </div>
          )}

          {user && !profile?.organic_id && (
            <div className="mt-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-lg text-yellow-800 mb-4">
                Hold $ORG tokens? Link your wallet and get your Organic ID!
              </p>
              <Link
                href="/profile"
                className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Go to Profile
              </Link>
            </div>
          )}

          {user && profile?.organic_id && (
            <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-lg text-green-800 mb-2">
                Welcome back, <strong>Organic #{profile.organic_id}</strong>!
              </p>
              <div className="flex gap-4 justify-center mt-4">
                <Link
                  href="/proposals"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  View Proposals
                </Link>
                <Link
                  href="/tasks"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
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
