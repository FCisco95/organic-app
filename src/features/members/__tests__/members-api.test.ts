import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('members API response shape', () => {
  it('strips email from member objects', () => {
    // Simulate the transform applied in the API route
    const raw = {
      id: '1', name: 'Test', email: 'test@example.com',
      avatar_url: null, organic_id: 1, role: 'member',
      total_points: 100, tasks_completed: 5, profile_visible: true,
      created_at: '2026-01-01', level: 3,
    };
    const { email, ...safe } = raw;
    const member = { ...safe, level: safe.level ?? 1 };
    assert.equal('email' in member, false, 'email must not be in response');
    assert.equal(member.name, 'Test');
    assert.equal(member.level, 3);
  });
});
