'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';

export default function Home() {
  const { user, profile, loading } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-organic-yellow/20 via-white to-organic-orange/20">
      <Navigation />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-6xl md:text-7xl font-luckiest text-organic-black mb-6 animate-breathe" style={{
            textShadow: '3px 3px 0px rgba(255,122,0,0.5)',
            WebkitTextStroke: '1px rgba(255,122,0,0.3)'
          }}>
            WELCOME TO <span className="text-organic-orange">ORGANIC</span>
          </h1>
          <p className="text-xl md:text-2xl font-comic text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
            A community coordination platform for the Organic DAO. Propose ideas, vote on
            decisions, and collaborate on tasks - all powered by $ORG!
          </p>

          {!user && (
            <div className="flex gap-6 justify-center">
              <Link
                href="/login"
                className="px-10 py-4 rounded-2xl font-luckiest text-xl text-white bg-gradient-to-r from-organic-orange to-organic-yellow hover:from-organic-yellow hover:to-organic-orange transition-all duration-200 transform hover:scale-110 active:translate-y-1 shadow-xl animate-breathe"
                style={{
                  boxShadow: '0 8px 0 0 #CC6200, 0 12px 20px rgba(0,0,0,0.3)',
                  textShadow: '2px 2px 0px rgba(0,0,0,0.3)'
                }}
              >
                GET STARTED
              </Link>
            </div>
          )}

          {user && !profile?.organic_id && (
            <div className="mt-12 bg-gradient-to-r from-organic-yellow to-organic-orange/30 border-4 border-organic-black rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl transform hover:scale-105 transition-all duration-200">
              <p className="text-2xl font-luckiest text-organic-black mb-6" style={{
                textShadow: '2px 2px 0px rgba(255,255,255,0.5)'
              }}>
                HOLD $ORG TOKENS?
              </p>
              <p className="text-lg font-comic text-gray-800 mb-6">
                Link your wallet and get your exclusive Organic ID!
              </p>
              <Link
                href="/profile"
                className="inline-block px-8 py-3 rounded-xl font-luckiest text-white bg-organic-black hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 active:translate-y-1 shadow-lg"
                style={{
                  boxShadow: '0 6px 0 0 rgba(0,0,0,0.5), 0 8px 15px rgba(0,0,0,0.3)'
                }}
              >
                GO TO PROFILE →
              </Link>
            </div>
          )}

          {user && profile?.organic_id && (
            <div className="mt-12 bg-gradient-to-r from-green-300 to-emerald-300 border-4 border-organic-black rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl animate-breathe">
              <p className="text-3xl font-luckiest text-organic-black mb-2" style={{
                textShadow: '2px 2px 0px rgba(255,255,255,0.5)'
              }}>
                WELCOME BACK!
              </p>
              <p className="text-2xl font-luckiest text-organic-orange mb-6">
                ORGANIC #{profile.organic_id}
              </p>
              <div className="flex gap-4 justify-center mt-6 flex-wrap">
                <Link
                  href="/proposals"
                  className="px-6 py-3 rounded-xl font-comic font-bold text-white bg-organic-orange hover:bg-orange-600 transition-all duration-200 transform hover:scale-105 active:translate-y-1 shadow-lg"
                  style={{
                    boxShadow: '0 6px 0 0 #CC6200, 0 8px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  View Proposals
                </Link>
                <Link
                  href="/tasks"
                  className="px-6 py-3 rounded-xl font-comic font-bold text-white bg-blue-500 hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 active:translate-y-1 shadow-lg"
                  style={{
                    boxShadow: '0 6px 0 0 #1E40AF, 0 8px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  View Tasks
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border-4 border-organic-black rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-all duration-200 hover:rotate-1">
            <div className="text-6xl mb-4 animate-breathe">📝</div>
            <h3 className="text-2xl font-luckiest text-organic-orange mb-3" style={{
              textShadow: '2px 2px 0px rgba(255,122,0,0.2)'
            }}>
              PROPOSALS
            </h3>
            <p className="text-lg font-comic text-gray-700 leading-relaxed">
              Submit ideas and vote on proposals with token-weighted voting power!
            </p>
          </div>

          <div className="bg-white border-4 border-organic-black rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-all duration-200 hover:-rotate-1">
            <div className="text-6xl mb-4 animate-breathe">✅</div>
            <h3 className="text-2xl font-luckiest text-organic-orange mb-3" style={{
              textShadow: '2px 2px 0px rgba(255,122,0,0.2)'
            }}>
              TASKS
            </h3>
            <p className="text-lg font-comic text-gray-700 leading-relaxed">
              Turn approved proposals into tasks and track progress with organized sprints!
            </p>
          </div>

          <div className="bg-white border-4 border-organic-black rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-all duration-200 hover:rotate-1">
            <div className="text-6xl mb-4 animate-breathe">🎫</div>
            <h3 className="text-2xl font-luckiest text-organic-orange mb-3" style={{
              textShadow: '2px 2px 0px rgba(255,122,0,0.2)'
            }}>
              ORGANIC ID
            </h3>
            <p className="text-lg font-comic text-gray-700 leading-relaxed">
              Token holders get a unique ID and verified member status in the community!
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-24 text-center">
          <div className="bg-gradient-to-r from-organic-orange to-organic-yellow border-4 border-organic-black rounded-2xl p-12 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <h2 className="text-4xl font-luckiest text-white mb-6" style={{
              textShadow: '3px 3px 0px rgba(0,0,0,0.3)',
              WebkitTextStroke: '1px rgba(0,0,0,0.2)'
            }}>
              POWERED BY $ORG
            </h2>
            <p className="text-xl font-comic text-white mb-8 max-w-2xl mx-auto" style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
            }}>
              The Organic DAO is a community-driven organization on Solana. Hold $ORG tokens to participate in governance and shape the future!
            </p>
            <div className="inline-block bg-white border-3 border-organic-black rounded-xl px-6 py-3 shadow-lg">
              <p className="font-comic font-bold text-organic-black text-sm mb-1">Contract Address</p>
              <p className="font-mono text-xs text-gray-700 break-all">
                {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
