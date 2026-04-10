import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Member Directory Privacy', () => {
  const membersRoute = readFileSync('src/app/api/members/route.ts', 'utf-8');

  it('should filter out hidden profiles in the main query', () => {
    // The main member list query must filter by profile_visible
    expect(membersRoute).toContain(".eq('profile_visible', true)");
  });

  it('should filter hidden profiles from role counts', () => {
    // Role counts should also exclude hidden profiles for consistency
    const roleCountSection = membersRoute.slice(
      membersRoute.indexOf('roleCountQuery')
    );
    expect(roleCountSection).toContain("profile_visible");
  });

  it('should apply profile_visible filter at least twice (main query + role counts)', () => {
    // Count occurrences of the filter — should appear in both the main query and role counts
    const matches = membersRoute.match(/\.eq\('profile_visible',\s*true\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Member Detail Email Safety', () => {
  const memberDetailRoute = readFileSync('src/app/api/members/[id]/route.ts', 'utf-8');

  it('should handle null emails without crashing', () => {
    // The email redaction must use null coalescing before .split()
    expect(memberDetailRoute).toMatch(/\(data\.email\s*\?\?\s*['"]['"]?\)\.split/);
  });
});
