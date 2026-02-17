'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-md rounded-lg border p-6">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We tracked this error. Try again, or refresh the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
