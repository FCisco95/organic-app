'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

const translations: Record<string, { title: string; description: string; tryAgain: string }> = {
  en: {
    title: 'Something went wrong',
    description: 'We tracked this error. Try again, or refresh the page.',
    tryAgain: 'Try again',
  },
  'pt-PT': {
    title: 'Algo correu mal',
    description: 'Registámos este erro. Tente novamente ou atualize a página.',
    tryAgain: 'Tentar novamente',
  },
  'zh-CN': {
    title: '出了点问题',
    description: '我们已记录此错误。请重试或刷新页面。',
    tryAgain: '重试',
  },
};

function getLocaleStrings() {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang && translations[lang]) return translations[lang];
  }
  return translations.en;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = getLocaleStrings();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-md rounded-lg border p-6">
            <h1 className="text-xl font-semibold">{t.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.description}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t.tryAgain}
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
