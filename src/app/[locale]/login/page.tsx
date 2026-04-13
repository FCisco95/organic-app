'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { AuthSplitPanel } from '@/components/auth/auth-split-panel';
import { sanitizeReturnTo } from '@/lib/security';

export default function LoginPage() {
  const t = useTranslations('Login');

  useEffect(() => {
    document.title = 'Sign In — Organic';
    return () => { document.title = 'Organic'; };
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
  const supabase = createClient();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = t('validationEmailBlank');
    }

    if (!password) {
      newErrors.password = t('validationPasswordBlank');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success(t('toastSuccess'));
      router.push(returnTo);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : '';
      const isCredentialError =
        raw.includes('Invalid login credentials') || raw.includes('invalid_credentials');
      setLoginError(isCredentialError ? t('toastInvalidCredentials') : raw || t('toastInvalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col md:flex-row" data-testid="login-page">
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
            {loginError && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{loginError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
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
                    if (loginError) setLoginError(null);
                  }}
                  className={`w-full px-4 py-2.5 bg-background border ${
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

              {/* Password */}
              <div className="animate-auth-fade-in auth-stagger-3">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    {t('passwordLabel')}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-organic-terracotta hover:text-organic-terracotta-hover transition-colors"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                      if (loginError) setLoginError(null);
                    }}
                    className={`w-full px-4 py-2.5 pr-11 bg-background border ${
                      errors.password ? 'border-red-500' : 'border-input'
                    } rounded-lg text-foreground text-sm focus:border-organic-terracotta focus:ring-2 focus:ring-organic-terracotta/20 focus:outline-none placeholder-muted-foreground transition-colors`}
                    placeholder={t('passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="animate-auth-fade-in auth-stagger-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cta hover:bg-cta-hover text-cta-fg font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('signingIn')}
                    </>
                  ) : (
                    t('signIn')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Navigation link outside card */}
        <div className="mt-4 w-full max-w-[400px] text-center border border-border rounded-lg p-4 bg-card animate-auth-fade-in auth-stagger-4">
          <p className="text-sm text-muted-foreground">
            {t('newToOrganic')}{' '}
            <Link
              href="/signup"
              className="text-organic-terracotta hover:text-organic-terracotta-hover font-medium transition-colors"
            >
              {t('createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
