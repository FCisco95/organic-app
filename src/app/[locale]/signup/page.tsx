'use client';

import { useState, useMemo, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { AuthSplitPanel } from '@/components/auth/auth-split-panel';

function PasswordStrengthBar({ password }: { password: string }) {
  const t = useTranslations('Signup');

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: t('strengthWeak'), color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: t('strengthFair'), color: 'bg-organic-terracotta' };
    if (score === 4) return { score: 3, label: t('strengthGood'), color: 'bg-yellow-400' };
    return { score: 4, label: t('strengthStrong'), color: 'bg-green-500' };
  }, [password, t]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
}

export default function SignUpPage() {
  const t = useTranslations('Signup');
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = 'Create Account — Organic';
    return () => { document.title = 'Organic'; };
  }, []);
  const referralCode = searchParams.get('ref') ?? undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>(
    {}
  );
  const [signupError, setSignupError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; username?: string } = {};

    if (!email) {
      newErrors.email = t('validationEmailBlank');
    }

    if (!password) {
      newErrors.password = t('validationPasswordBlank');
    } else if (password.length < 8) {
      newErrors.password = t('validationPasswordShort');
    }

    if (!username) {
      newErrors.username = t('validationUsernameBlank');
    } else if (!/^[a-zA-Z0-9-]+$/.test(username)) {
      newErrors.username = t('validationUsernamePattern');
    } else if (username.startsWith('-') || username.endsWith('-')) {
      newErrors.username = t('validationUsernameHyphen');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        },
      });

      if (error) throw error;

      toast.success(t('toastSuccess'));
      router.push('/login');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('toastError');
      setSignupError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col md:flex-row" data-testid="signup-page">
      {/* Left panel - branding (desktop only) */}
      <AuthSplitPanel
        title={t('leftPanelTitle')}
        subtitle={t('leftPanelSubtitle')}
        footer={t('leftPanelFooter')}
        logoAlt={t('logoAlt')}
      />

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-start pt-8 md:justify-center md:pt-0 bg-background p-6 md:p-10 lg:p-14 min-h-dvh md:min-h-0">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 flex justify-center">
          <Link href="/">
            <Image
              src="/organic-logo.png"
              alt={t('logoAlt')}
              width={1000}
              height={335}
              className="w-full max-w-[180px]"
              priority
            />
          </Link>
        </div>

        {/* Card with Alt A styling + Alt C shadow */}
        <div className="w-full max-w-[400px] bg-card rounded-lg border border-border shadow-xl shadow-[0_0_40px_rgba(217,93,57,0.08)] overflow-hidden">
          {/* Subtle terracotta accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-organic-terracotta to-transparent" />

          <div className="p-8">
            <h1 className="text-2xl font-light text-foreground mb-6 text-center md:text-left animate-auth-fade-in auth-stagger-1">
              {t('title')}
            </h1>

            {/* Inline error banner */}
            {signupError && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{signupError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="signup-form">
              {/* Email */}
              <div className="animate-auth-fade-in auth-stagger-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  {t('emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                    if (signupError) setSignupError(null);
                  }}
                  className={`w-full px-4 py-3 bg-background border ${
                    errors.email ? 'border-red-500' : 'border-input'
                  } rounded-lg text-foreground text-sm focus:border-organic-terracotta focus:ring-2 focus:ring-organic-terracotta/20 focus:outline-none placeholder-muted-foreground transition-colors`}
                  placeholder={t('emailPlaceholder')}
                />
                {errors.email && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="animate-auth-fade-in auth-stagger-3">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t('usernameLabel')}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors({ ...errors, username: undefined });
                    if (signupError) setSignupError(null);
                  }}
                  className={`w-full px-4 py-3 bg-background border ${
                    errors.username ? 'border-red-500' : 'border-input'
                  } rounded-lg text-foreground text-sm focus:border-organic-terracotta focus:ring-2 focus:ring-organic-terracotta/20 focus:outline-none placeholder-muted-foreground transition-colors`}
                  placeholder={t('usernamePlaceholder')}
                />
                {errors.username ? (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.username}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">{t('usernameHelp')}</p>
                )}
              </div>

              {/* Password */}
              <div className="animate-auth-fade-in auth-stagger-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t('passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                      if (signupError) setSignupError(null);
                    }}
                    className={`w-full px-4 py-3 pr-12 bg-background border ${
                      errors.password ? 'border-red-500' : 'border-input'
                    } rounded-lg text-foreground text-sm focus:border-organic-terracotta focus:ring-2 focus:ring-organic-terracotta/20 focus:outline-none placeholder-muted-foreground transition-colors`}
                    placeholder={t('passwordPlaceholder')}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex h-[44px] w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.password}
                  </p>
                ) : (
                  <>
                    <PasswordStrengthBar password={password} />
                    {!password && (
                      <p className="mt-2 text-xs text-muted-foreground">{t('passwordHelp')}</p>
                    )}
                  </>
                )}
              </div>

              <div className="animate-auth-fade-in auth-stagger-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cta hover:bg-cta-hover text-cta-fg font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('creatingAccount')}
                    </>
                  ) : (
                    t('createAccount')
                  )}
                </button>
              </div>
            </form>

            {/* Terms */}
            <p className="mt-6 text-xs text-muted-foreground text-center animate-auth-fade-in auth-stagger-6">
              {t('termsPrefix')}{' '}
              <Link
                href="/terms"
                className="inline text-organic-terracotta hover:text-organic-terracotta-hover transition-colors underline-offset-2 hover:underline"
              >
                {t('termsLink')}
              </Link>
              {t('termsSuffix')}
            </p>
          </div>
        </div>

        {/* Navigation link outside card */}
        <div className="mt-4 w-full max-w-[400px] text-center border border-border rounded-lg p-4 bg-card animate-auth-fade-in auth-stagger-6">
          <p className="text-sm text-muted-foreground flex items-center justify-center flex-wrap gap-x-1">
            {t('alreadyHaveAccount')}{' '}
            <Link
              href="/login"
              className="inline-flex items-center min-h-[44px] py-2 text-organic-terracotta hover:text-organic-terracotta-hover font-medium transition-colors"
            >
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
