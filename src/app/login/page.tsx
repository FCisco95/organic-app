'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success('Logged in successfully!');
        router.push('/profile');
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        toast.success('Check your email to confirm your account!');
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-organic-yellow/30 via-white to-organic-orange/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-organic-orange to-organic-yellow rounded-2xl flex items-center justify-center shadow-2xl border-4 border-organic-black animate-breathe">
              <span className="text-3xl font-luckiest text-white" style={{
                textShadow: '2px 2px 0px rgba(0,0,0,0.3)',
                WebkitTextStroke: '1px rgba(0,0,0,0.2)'
              }}>
                O
              </span>
            </div>
          </div>
          <h2 className="text-4xl font-luckiest text-organic-black mb-2" style={{
            textShadow: '2px 2px 0px rgba(255,122,0,0.3)',
            WebkitTextStroke: '0.5px rgba(255,122,0,0.3)'
          }}>
            ORGANIC DAO
          </h2>
          <p className="text-lg font-comic text-gray-700">Community Coordination Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-organic-black">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-luckiest text-organic-orange mb-3" style={{
              textShadow: '2px 2px 0px rgba(255,122,0,0.2)',
              WebkitTextStroke: '0.5px rgba(255,122,0,0.3)'
            }}>
              {isLogin ? 'WELCOME BACK!' : 'JOIN ORGANIC'}
            </h1>
            <p className="text-base font-comic text-gray-600">
              {isLogin ? 'Sign in to access your account' : 'Create an account to get started'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-comic font-bold text-gray-800 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl focus:border-organic-orange focus:ring-0 transition-all font-comic"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-comic font-bold text-gray-800 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl focus:border-organic-orange focus:ring-0 transition-all font-comic"
                placeholder="••••••••"
              />
              {!isLogin && (
                <p className="mt-2 text-sm font-comic text-gray-500">Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-organic-orange to-organic-yellow hover:from-organic-yellow hover:to-organic-orange text-white font-luckiest text-lg py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:translate-y-1"
              style={{
                boxShadow: loading ? 'none' : '0 6px 0 0 #CC6200, 0 10px 15px rgba(0,0,0,0.3)',
                textShadow: '2px 2px 0px rgba(0,0,0,0.2)'
              }}
            >
              {loading ? 'PROCESSING...' : isLogin ? 'SIGN IN' : 'SIGN UP'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-comic font-bold text-organic-orange hover:text-orange-600 transition-colors underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm font-comic font-bold text-gray-600 hover:text-organic-black transition-colors inline-flex items-center"
            >
              <span className="mr-1">←</span> Back to home
            </Link>
          </div>
        </div>

        {/* Info Box */}
        {!isLogin && (
          <div className="mt-6 bg-organic-yellow/20 border-3 border-organic-orange rounded-xl p-5">
            <p className="text-sm font-comic text-gray-800">
              <strong className="font-bold">Note:</strong> After signing up, you'll receive a verification email. Check
              your inbox and spam folder!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
