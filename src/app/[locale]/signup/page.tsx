'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});
  const router = useRouter();
  const supabase = createClient();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; username?: string } = {};

    if (!email) {
      newErrors.email = 'Email cannot be blank';
    }

    if (!password) {
      newErrors.password = 'Password cannot be blank';
    } else if (password.length < 8) {
      newErrors.password = 'Password should be at least 8 characters';
    }

    if (!username) {
      newErrors.username = 'Username cannot be blank';
    } else if (!/^[a-zA-Z0-9-]+$/.test(username)) {
      newErrors.username = 'Username may only contain alphanumeric characters or single hyphens';
    } else if (username.startsWith('-') || username.endsWith('-')) {
      newErrors.username = 'Username cannot begin or end with a hyphen';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      toast.success('Check your email to confirm your account!');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block group">
            <Image
              src="/organic-logo.png"
              alt="Organic Logo"
              width={1000}
              height={335}
              className="w-full max-w-md transition-transform group-hover:scale-105 mx-auto"
              priority
            />
          </Link>
        </div>

        {/* Sign up form */}
        <div className="bg-[#161b22] rounded-md border border-[#30363d] p-6">
          <h1 className="text-2xl font-light text-white mb-2 text-center">
            Sign up for Organic
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-normal text-[#c9d1d9] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                className={`w-full px-3 py-2 bg-[#0d1117] border ${
                  errors.email ? 'border-[#f85149]' : 'border-[#30363d]'
                } rounded-md text-white text-sm focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] focus:outline-none placeholder-[#6e7681]`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-2 text-xs text-[#f85149] flex items-start">
                  <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L4.75 9.19l4.97-4.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/>
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-normal text-[#c9d1d9] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                className={`w-full px-3 py-2 bg-[#0d1117] border ${
                  errors.password ? 'border-[#f85149]' : 'border-[#30363d]'
                } rounded-md text-white text-sm focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] focus:outline-none placeholder-[#6e7681]`}
                placeholder="Password"
                minLength={8}
              />
              {errors.password && (
                <p className="mt-2 text-xs text-[#f85149] flex items-start">
                  <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L4.75 9.19l4.97-4.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/>
                  </svg>
                  {errors.password}
                </p>
              )}
              {!errors.password && (
                <p className="mt-2 text-xs text-[#7d8590]">
                  Password should be at least 8 characters including a number and a lowercase letter.
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-normal text-[#c9d1d9] mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors({ ...errors, username: undefined });
                }}
                className={`w-full px-3 py-2 bg-[#0d1117] border ${
                  errors.username ? 'border-[#f85149]' : 'border-[#30363d]'
                } rounded-md text-white text-sm focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] focus:outline-none placeholder-[#6e7681]`}
                placeholder="Username"
              />
              {errors.username && (
                <p className="mt-2 text-xs text-[#f85149] flex items-start">
                  <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L4.75 9.19l4.97-4.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/>
                  </svg>
                  {errors.username}
                </p>
              )}
              {!errors.username && (
                <p className="mt-2 text-xs text-[#7d8590]">
                  Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-xs text-[#7d8590] text-center">
            By creating an account, you agree to the{' '}
            <Link href="/terms" className="text-[#58a6ff] hover:underline">
              Terms of Service
            </Link>
            . We'll occasionally send you account-related emails.
          </p>
        </div>

        {/* Sign in link */}
        <div className="mt-4 text-center border border-[#30363d] rounded-md p-4 bg-[#161b22]">
          <p className="text-sm text-[#c9d1d9]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#58a6ff] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
