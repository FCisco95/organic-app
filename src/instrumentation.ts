import * as Sentry from '@sentry/nextjs';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  // Edge runtime disabled in dev — causes EvalError with strict CSP
  if (process.env.NEXT_RUNTIME === 'edge' && process.env.NODE_ENV === 'production') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
