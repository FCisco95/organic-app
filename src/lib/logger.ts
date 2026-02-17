type LogLevel = 'info' | 'warn' | 'error';

import { captureSentryException, captureSentryMessage } from '@/lib/sentry';

function serializeArg(arg: unknown): unknown {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }

  if (typeof arg === 'bigint') {
    return arg.toString();
  }

  return arg;
}

function isBuildTimeExpectedDiagnostic(args: unknown[]): boolean {
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    return false;
  }

  return args.some((arg) => {
    if (typeof arg === 'string') {
      return (
        arg.includes('Dynamic server usage:') ||
        arg.includes('inside a function cached with "unstable_cache(...)"')
      );
    }

    if (arg instanceof Error) {
      return (
        arg.message.includes('Dynamic server usage:') ||
        arg.message.includes('inside a function cached with "unstable_cache(...)"')
      );
    }

    return false;
  });
}

function reportToSentry(level: LogLevel, args: unknown[]): void {
  if (level !== 'error') {
    return;
  }

  const firstError = args.find((arg) => arg instanceof Error);
  if (firstError instanceof Error) {
    captureSentryException(firstError, { args: args.map(serializeArg) });
    return;
  }

  const message =
    typeof args[0] === 'string'
      ? args[0]
      : 'Non-error exception captured via logger.error';

  captureSentryMessage(message, { args: args.map(serializeArg) });
}

function writeLog(level: LogLevel, args: unknown[]): void {
  if (isBuildTimeExpectedDiagnostic(args)) {
    return;
  }

  const serializedArgs = args.map(serializeArg);
  reportToSentry(level, args);

  if (process.env.NODE_ENV === 'production') {
    const payload = {
      level,
      timestamp: new Date().toISOString(),
      data: serializedArgs,
    };

    if (level === 'error') {
      console.error(JSON.stringify(payload));
      return;
    }

    if (level === 'warn') {
      console.warn(JSON.stringify(payload));
      return;
    }

    console.info(JSON.stringify(payload));
    return;
  }

  if (level === 'error') {
    console.error(...serializedArgs);
    return;
  }

  if (level === 'warn') {
    console.warn(...serializedArgs);
    return;
  }

  console.info(...serializedArgs);
}

export const logger = {
  error: (...args: unknown[]) => writeLog('error', args),
  warn: (...args: unknown[]) => writeLog('warn', args),
  info: (...args: unknown[]) => writeLog('info', args),
};
