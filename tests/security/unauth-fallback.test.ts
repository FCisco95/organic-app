import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Regression: unauthenticated visitors to /posts, /community, /ideas and
// /ideas/harvest were seeing permanent skeleton shimmer with no sign-in
// affordance. Fix: shared UnauthFallback component rendered at the list
// layer when no authenticated user is present.
//
// These tests lock in that the component exists, is wired into each
// affected page, and ships localized copy in both primary locales.

const unauthFallback = readFileSync('src/components/ui/unauth-fallback.tsx', 'utf-8');
const postsPage = readFileSync('src/app/[locale]/posts/page.tsx', 'utf-8');
const communityPage = readFileSync('src/app/[locale]/community/page.tsx', 'utf-8');
const ideasPage = readFileSync('src/app/[locale]/ideas/page.tsx', 'utf-8');
const harvestPage = readFileSync('src/app/[locale]/ideas/harvest/page.tsx', 'utf-8');
const enMessages = JSON.parse(readFileSync('messages/en.json', 'utf-8')) as Record<
  string,
  Record<string, string>
>;
const zhMessages = JSON.parse(readFileSync('messages/zh-CN.json', 'utf-8')) as Record<
  string,
  Record<string, string>
>;

describe('UnauthFallback: shared component', () => {
  it('exports a component that accepts title, description, icon and returnTo', () => {
    expect(unauthFallback).toMatch(/export function UnauthFallback/);
    expect(unauthFallback).toMatch(/title:\s*string/);
    expect(unauthFallback).toMatch(/description:\s*string/);
    expect(unauthFallback).toMatch(/icon\?:\s*LucideIcon/);
    expect(unauthFallback).toMatch(/returnTo\?:\s*string/);
  });

  it('renders localized sign-in and sign-up CTAs from the UnauthFallback namespace', () => {
    expect(unauthFallback).toMatch(/useTranslations\('UnauthFallback'\)/);
    expect(unauthFallback).toMatch(/signInCta/);
    expect(unauthFallback).toMatch(/signUpCta/);
  });

  it('threads returnTo through to /login and /signup without breaking the locale prefix', () => {
    expect(unauthFallback).toMatch(/\/login/);
    expect(unauthFallback).toMatch(/\/signup/);
    expect(unauthFallback).toMatch(/encodeURIComponent/);
  });

  it('sign-in and sign-up CTAs meet the 44px touch-target minimum', () => {
    const ctaBlocks = unauthFallback.match(/min-h-\[44px\]/g) ?? [];
    expect(ctaBlocks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('UnauthFallback: wired into affected pages', () => {
  for (const [name, source] of [
    ['posts page', postsPage],
    ['community page', communityPage],
    ['ideas page', ideasPage],
    ['harvest page', harvestPage],
  ] as const) {
    it(`${name} imports UnauthFallback`, () => {
      expect(source).toMatch(/from '@\/components\/ui\/unauth-fallback'/);
      expect(source).toMatch(/UnauthFallback/);
    });

    it(`${name} checks auth state before rendering the primary content area`, () => {
      expect(source).toMatch(/useAuth\(\)/);
      expect(source).toMatch(/showUnauthFallback/);
    });
  }
});

describe('UnauthFallback: localized copy in en + zh-CN', () => {
  const expectedKeys = [
    'signInCta',
    'signUpCta',
    'postsTitle',
    'postsDescription',
    'communityTitle',
    'communityDescription',
    'ideasTitle',
    'ideasDescription',
    'harvestTitle',
    'harvestDescription',
  ] as const;

  it('every expected key has a non-empty English string', () => {
    const en = enMessages.UnauthFallback ?? {};
    for (const key of expectedKeys) {
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    }
  });

  it('every expected key has a non-empty Simplified Chinese string', () => {
    const zh = zhMessages.UnauthFallback ?? {};
    for (const key of expectedKeys) {
      expect(typeof zh[key]).toBe('string');
      expect(zh[key].length).toBeGreaterThan(0);
    }
  });
});

describe('Posts filter row: scroll affordance + touch targets', () => {
  it('adds a right-edge gradient to the sort row so overflowed sorts are discoverable', () => {
    const sortBlock = postsPage.slice(
      postsPage.indexOf('Sort + View toggle'),
      postsPage.indexOf('Type filters')
    );
    expect(sortBlock).toMatch(/bg-gradient-to-l from-background to-transparent/);
    // The gradient must live in a relative positioned wrapper to overlay the scroll region
    expect(sortBlock).toMatch(/relative min-w-0 flex-1/);
  });

  it('all /posts filter pills declare min-h-[44px] to clear the touch-target floor', () => {
    const filterBlock = postsPage.slice(
      postsPage.indexOf('Sort + View toggle'),
      postsPage.indexOf('{/* Feed */}')
    );
    // sort pills, type filter pills, organic pill, view toggle buttons
    const matches = filterBlock.match(/min-h-\[44px\]/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Profile stats row: scroll affordance on mobile', () => {
  const profilePage = readFileSync('src/app/[locale]/profile/page.tsx', 'utf-8');
  const progressionShell = readFileSync(
    'src/components/gamification/progression-shell.tsx',
    'utf-8'
  );

  it('/profile hero stats row has a right-edge gradient so the last stat is not clipped invisibly', () => {
    expect(profilePage).toMatch(/bg-gradient-to-l from-gray-900 to-transparent/);
  });

  it('/profile/progression stat bar has a right-edge gradient fading to the card background', () => {
    expect(progressionShell).toMatch(/bg-gradient-to-l from-card to-transparent/);
  });
});
