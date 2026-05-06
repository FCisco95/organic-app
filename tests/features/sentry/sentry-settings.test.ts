import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getSentryDsn,
  getSentryEnvironment,
  parseSampleRate,
} from '@/lib/sentry-settings';

const ENV_KEYS = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_ENVIRONMENT',
  'SENTRY_ENVIRONMENT',
  'NODE_ENV',
] as const;

describe('parseSampleRate', () => {
  it('returns fallback for undefined input', () => {
    expect(parseSampleRate(undefined, 0.1)).toBe(0.1);
  });

  it('returns fallback for empty string', () => {
    expect(parseSampleRate('', 0.25)).toBe(0.25);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(parseSampleRate('abc', 0.5)).toBe(0.5);
    expect(parseSampleRate('NaN', 0.5)).toBe(0.5);
  });

  it('returns the parsed value when in [0, 1]', () => {
    expect(parseSampleRate('0', 0.1)).toBe(0);
    expect(parseSampleRate('0.5', 0.1)).toBe(0.5);
    expect(parseSampleRate('1', 0.1)).toBe(1);
  });

  it('returns fallback when value is out of [0, 1] range', () => {
    expect(parseSampleRate('-0.1', 0.5)).toBe(0.5);
    expect(parseSampleRate('1.1', 0.5)).toBe(0.5);
    expect(parseSampleRate('100', 0.5)).toBe(0.5);
  });
});

describe('getSentryDsn', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  it('returns empty string when no env var is set', () => {
    expect(getSentryDsn()).toBe('');
  });

  it('returns NEXT_PUBLIC_SENTRY_DSN when set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public-dsn@example.io/1';
    expect(getSentryDsn()).toBe('https://public-dsn@example.io/1');
  });

  it('falls back to SENTRY_DSN when NEXT_PUBLIC is unset', () => {
    process.env.SENTRY_DSN = 'https://server-dsn@example.io/2';
    expect(getSentryDsn()).toBe('https://server-dsn@example.io/2');
  });

  it('prefers NEXT_PUBLIC_SENTRY_DSN over SENTRY_DSN when both set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@example.io/1';
    process.env.SENTRY_DSN = 'https://server@example.io/2';
    expect(getSentryDsn()).toBe('https://public@example.io/1');
  });
});

describe('getSentryEnvironment', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  it("falls back to 'development' when nothing is set", () => {
    expect(getSentryEnvironment()).toBe('development');
  });

  it('returns NODE_ENV when only that is set', () => {
    process.env.NODE_ENV = 'staging';
    expect(getSentryEnvironment()).toBe('staging');
  });

  it('returns SENTRY_ENVIRONMENT over NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENTRY_ENVIRONMENT = 'preview';
    expect(getSentryEnvironment()).toBe('preview');
  });

  it('returns NEXT_PUBLIC_SENTRY_ENVIRONMENT over SENTRY_ENVIRONMENT and NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENTRY_ENVIRONMENT = 'preview';
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT = 'canary';
    expect(getSentryEnvironment()).toBe('canary');
  });
});
