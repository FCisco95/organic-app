import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

/**
 * Every translate route must:
 *  - require an authenticated session via supabase.auth.getUser()
 *  - return 401 for unauthenticated callers
 *  - apply the shared `translate` rate-limit bucket (20/hr/user)
 *  - validate the request body via translateRequestSchema
 */
const TRANSLATE_ROUTES = [
  'src/app/api/posts/[id]/translate/route.ts',
  'src/app/api/proposals/[id]/translate/route.ts',
  'src/app/api/ideas/[id]/translate/route.ts',
  'src/app/api/translate/comment/[commentId]/route.ts',
] as const;

describe('translate route authentication gates', () => {
  for (const route of TRANSLATE_ROUTES) {
    describe(route, () => {
      const source = readFileSync(route, 'utf-8');

      it('fetches the current user via supabase auth', () => {
        expect(source).toMatch(/supabase\.auth\.getUser\(\)/);
      });

      it('returns 401 when unauthenticated', () => {
        expect(source).toMatch(
          /if \(!user\)[\s\S]{0,200}status:\s*401/
        );
      });

      it('applies the translate rate-limit bucket', () => {
        expect(source).toMatch(
          /applyUserRateLimit\([^,]+,\s*'translate',\s*RATE_LIMITS\.translate\)/
        );
      });

      it('validates input against translateRequestSchema', () => {
        expect(source).toMatch(/translateRequestSchema\.safeParse/);
      });
    });
  }
});

describe('middleware rate-limit path pattern', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf-8');

  it('includes all four translate path shapes in the pattern source', () => {
    expect(middleware).toMatch(
      /TRANSLATE_RATE_LIMIT_PATH_PATTERN\s*=[\s\S]{0,200}posts\|proposals\|ideas/
    );
    expect(middleware).toMatch(
      /TRANSLATE_RATE_LIMIT_PATH_PATTERN\s*=[\s\S]{0,200}\/api\\\/translate\\\/comment/
    );
  });

  it('removes the legacy post-comment nested translate path', () => {
    expect(middleware).not.toMatch(/comments\\\/\[\^\/\]\+\\\/translate/);
  });
});
