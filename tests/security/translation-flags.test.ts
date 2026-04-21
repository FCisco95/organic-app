import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

/**
 * Admin-only translation toggles:
 *  - Each translate route MUST check `isTranslationEnabled(supabase, <key>)`
 *    BEFORE calling the provider, and return 403 when the flag is off.
 *    This prevents a client-side bypass burning DeepL quota.
 *  - The PATCH path (/api/settings) that mutates translation_settings
 *    stays admin-gated via the existing admin role check.
 *  - The public GET path (/api/settings/public-flags) MUST NOT leak
 *    anything other than translation_settings.
 *
 * These are source-regex checks in the same style as
 * tests/security/pulse-analytics.test.ts and
 * tests/security/sprints-task-transition.test.ts — they lock the
 * structure in place so a future refactor cannot silently strip the
 * server-side gate and reintroduce the bypass.
 */

const ROUTE_FLAG_MAP: Record<string, string> = {
  'src/app/api/posts/[id]/translate/route.ts': 'posts',
  'src/app/api/proposals/[id]/translate/route.ts': 'proposals',
  'src/app/api/ideas/[id]/translate/route.ts': 'ideas',
  'src/app/api/tasks/[id]/translate/route.ts': 'tasks',
  'src/app/api/translate/comment/[commentId]/route.ts': 'comments',
};

describe('translate routes: server-side flag enforcement', () => {
  for (const [route, flag] of Object.entries(ROUTE_FLAG_MAP)) {
    describe(`${route} → flag "${flag}"`, () => {
      const source = readFileSync(route, 'utf-8');

      it('imports the isTranslationEnabled helper', () => {
        expect(source).toMatch(
          /from\s+['"]@\/lib\/translation\/flags['"]/
        );
        expect(source).toMatch(/isTranslationEnabled/);
      });

      it(`checks the "${flag}" flag and returns 403 when disabled`, () => {
        // The check must appear before the translateContent call so a
        // disabled flag short-circuits before any DeepL spend.
        const flagCheckIdx = source.search(
          new RegExp(
            `isTranslationEnabled\\(\\s*supabase\\s*,\\s*['"]${flag}['"]\\s*\\)`
          )
        );
        expect(flagCheckIdx, `flag check for "${flag}" missing`).toBeGreaterThan(
          -1
        );

        const translateCallIdx = source.indexOf('translateContent(');
        if (translateCallIdx !== -1) {
          expect(flagCheckIdx).toBeLessThan(translateCallIdx);
        }

        // 403 returned near the flag branch.
        const windowAfterFlag = source.slice(flagCheckIdx, flagCheckIdx + 400);
        expect(windowAfterFlag).toMatch(/status:\s*403/);
      });
    });
  }
});

describe('admin PATCH of translation_settings is gated', () => {
  const settingsRoute = readFileSync('src/app/api/settings/route.ts', 'utf-8');

  it('PATCH requires admin role (403 for non-admins)', () => {
    // Existing admin gate: enforces `profile.role !== 'admin'` → 403.
    expect(settingsRoute).toMatch(
      /profile\.role\s*!==\s*['"]admin['"][\s\S]{0,200}status:\s*403/
    );
  });

  it('translation_settings audit scope is wired into the special audit path', () => {
    expect(settingsRoute).toMatch(
      /pushSpecialAuditRow\(\s*['"]translation_settings['"],\s*['"]translation_settings['"]\s*\)/
    );
  });

  it('translation_settings is in SPECIAL_ORG_SCOPES so base-org audit does not double-log it', () => {
    expect(settingsRoute).toMatch(
      /SPECIAL_ORG_SCOPES\s*=\s*new\s+Set\([\s\S]{0,200}'translation_settings'/
    );
  });
});

describe('public flags endpoint exposes only translation settings', () => {
  const publicFlagsRoute = readFileSync(
    'src/app/api/settings/public-flags/route.ts',
    'utf-8'
  );

  it('only selects translation_settings from orgs (no secrets leak)', () => {
    expect(publicFlagsRoute).toMatch(
      /\.select\(\s*['"]translation_settings['"]\s*\)/
    );
    // Defensive: nothing else on the orgs row should be returned.
    expect(publicFlagsRoute).not.toMatch(/token_mint/);
    expect(publicFlagsRoute).not.toMatch(/treasury_wallet/);
    expect(publicFlagsRoute).not.toMatch(/governance_policy/);
  });

  it('falls back to defaults instead of leaking an internal error', () => {
    expect(publicFlagsRoute).toMatch(/DEFAULT_TRANSLATION_SETTINGS/);
  });
});

describe('translation flag defaults', () => {
  const schemas = readFileSync('src/features/settings/schemas.ts', 'utf-8');

  it('comments default to false so DeepL quota is not burned out of the box', () => {
    // Structural guard: if someone flips the default, both the tab and the
    // server gate start letting comments through without an admin opt-in.
    const match = schemas.match(
      /DEFAULT_TRANSLATION_SETTINGS[\s\S]{0,300}comments:\s*(true|false)/
    );
    expect(match, 'DEFAULT_TRANSLATION_SETTINGS.comments must be set').not.toBeNull();
    expect(match![1]).toBe('false');
  });

  it('posts, proposals, ideas, tasks default to true', () => {
    for (const key of ['posts', 'proposals', 'ideas', 'tasks'] as const) {
      const re = new RegExp(
        `DEFAULT_TRANSLATION_SETTINGS[\\s\\S]{0,300}${key}:\\s*(true|false)`
      );
      const match = schemas.match(re);
      expect(match, `${key} default must be set`).not.toBeNull();
      expect(match![1]).toBe('true');
    }
  });
});
