import * as Sentry from '@sentry/nextjs';
import { getSentryDsn } from '@/lib/sentry-settings';

export function isSentryEnabled(): boolean {
  return getSentryDsn().length > 0;
}

export function captureSentryException(
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (Object.keys(context).length > 0) {
      scope.setContext('logger', context);
    }

    Sentry.captureException(error);
  });
}

export function captureSentryMessage(
  message: string,
  context: Record<string, unknown> = {}
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (Object.keys(context).length > 0) {
      scope.setContext('logger', context);
    }

    Sentry.captureMessage(message, 'error');
  });
}
