import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { KNOWN_ACTIVITY_EVENT_TYPES } from '@/features/activity';

/**
 * Regression test for the production smoke-test bug:
 *
 *   IntlError: MISSING_MESSAGE: Could not resolve
 *   `dashboard.activity.dispute_escalated` in messages for locale `en`.
 *
 * `<ActivityItem />` translates each activity-log entry's `event_type`
 * via `t(`dashboard.activity.${event_type}`)`. If any locale is missing
 * a key for any known event type, the dashboard throws at runtime.
 *
 * This test loads each locale JSON and asserts that every event type
 * advertised by `KNOWN_ACTIVITY_EVENT_TYPES` (the single source of
 * truth, mirroring the `activity_event_type` Postgres enum) has a
 * non-empty translation in every locale.
 */

const LOCALES = ['en', 'pt-PT', 'zh-CN'] as const;
type Locale = (typeof LOCALES)[number];

interface LocaleMessages {
  dashboard?: {
    activity?: Record<string, string>;
  };
}

function loadActivityMessages(locale: Locale): Record<string, string> {
  const filePath = resolve(__dirname, '../../../messages', `${locale}.json`);
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as LocaleMessages;
  return parsed.dashboard?.activity ?? {};
}

describe('dashboard.activity i18n coverage', () => {
  it('exposes a non-empty list of known event types', () => {
    expect(KNOWN_ACTIVITY_EVENT_TYPES.length).toBeGreaterThan(0);
  });

  it.each(LOCALES)(
    'has a translation for every known event type in %s',
    (locale) => {
      const messages = loadActivityMessages(locale);
      const missing = KNOWN_ACTIVITY_EVENT_TYPES.filter((eventType) => {
        const value = messages[eventType];
        return typeof value !== 'string' || value.trim().length === 0;
      });

      // Loud failure surface so a missing key is obvious in CI logs.
      expect(
        missing,
        `Missing dashboard.activity.<key> translations in ${locale}: ${missing.join(', ')}`,
      ).toEqual([]);
    },
  );

  it('does not duplicate event types in the source-of-truth list', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const eventType of KNOWN_ACTIVITY_EVENT_TYPES) {
      if (seen.has(eventType)) {
        duplicates.push(eventType);
      }
      seen.add(eventType);
    }
    expect(duplicates).toEqual([]);
  });
});
