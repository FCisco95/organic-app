'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-organic-orange to-organic-yellow rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-xl">O</span>
            </div>
          </div>
          <h2 className="text-gray-900 text-2xl font-bold">Organic DAO</h2>
          <p className="text-gray-600 mt-1 text-sm">Community Coordination Platform</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Join Organic'}
            </h1>
            <p className="text-sm text-gray-600">
              {isLogin ? 'Sign in to access your account' : 'Create an account to get started'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent transition-all text-sm"
                placeholder="••••••••"
              />
              {!isLogin && (
                <p className="mt-1.5 text-xs text-gray-500">Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-organic-orange hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-organic-orange hover:text-orange-600 font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center"
            >
              <span className="mr-1">←</span> Back to home
            </Link>
          </div>
        </div>

        {/* Info Box */}
        {!isLogin && (
          <div className="mt-5 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong className="font-semibold">Note:</strong> After signing up, you'll receive a verification email. Check
              your inbox and spam folder.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
