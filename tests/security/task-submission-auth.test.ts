import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Task Submission Authorization', () => {
  const submissionsRoute = readFileSync(
    'src/app/api/tasks/[id]/submissions/route.ts',
    'utf-8'
  );

  it('should use serviceClient for task lookup (resilient read)', () => {
    // The task lookup should use serviceClient to avoid transient RLS failures
    expect(submissionsRoute).toMatch(
      /await serviceClient\s*\n?\s*\.from\('tasks'\)/
    );
  });

  it('should use user-scoped client for profile lookup', () => {
    // Profile lookup should respect user scope
    const profileSection = submissionsRoute.slice(
      submissionsRoute.indexOf("'user_profiles'")
    );
    expect(profileSection).toBeDefined();
    // The profile query should NOT use serviceClient
    const beforeProfile = submissionsRoute.slice(
      0,
      submissionsRoute.indexOf("from('user_profiles')")
    );
    const lastClientBeforeProfile = beforeProfile.lastIndexOf('await supabase');
    const lastServiceBeforeProfile = beforeProfile.lastIndexOf('await serviceClient');
    // supabase should be the client used right before the user_profiles query
    expect(lastClientBeforeProfile).toBeGreaterThan(lastServiceBeforeProfile);
  });

  it('should NOT cascade serviceClient to sprint/twitter queries', () => {
    // Sprint query should use user-scoped client
    const sprintSection = submissionsRoute.slice(
      submissionsRoute.indexOf("from('sprints')")
    );
    const beforeSprint = submissionsRoute.slice(
      0,
      submissionsRoute.indexOf("from('sprints')")
    );
    // Check that supabase (not serviceClient) is used for sprints
    expect(beforeSprint.slice(-200)).toContain('supabase');
  });

  it('should authenticate the caller before any task lookup', () => {
    const authCheckPos = submissionsRoute.indexOf('auth.getUser()');
    const taskLookupPos = submissionsRoute.indexOf("from('tasks')");
    // Ensure auth check happens before task lookup
    expect(authCheckPos).toBeLessThan(taskLookupPos);
    expect(authCheckPos).toBeGreaterThan(-1);
  });
});
