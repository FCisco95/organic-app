import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function AuthErrorPage() {
  const t = useTranslations('AuthError');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4" data-testid="auth-error-page">
      <div className="w-full max-w-md rounded-md border border-[#30363d] bg-[#161b22] p-6 text-center">
        <h1 className="text-2xl font-light text-white">{t('title')}</h1>
        <p className="mt-3 text-sm text-[#c9d1d9]">{t('description')}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#238636] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2ea043]"
          >
            {t('backToLogin')}
          </Link>
          <Link
            href="/"
            className="rounded-md border border-[#30363d] px-4 py-2 text-sm font-medium text-[#c9d1d9] transition-colors hover:bg-[#0d1117]"
          >
            {t('goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
