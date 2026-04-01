export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  const { captureRequestError } = await import('@sentry/nextjs');
  return captureRequestError(...args);
}
