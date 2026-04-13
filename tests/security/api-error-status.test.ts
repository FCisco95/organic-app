import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('API Error Status Codes', () => {
  describe('Posts API', () => {
    const postsRoute = readFileSync('src/app/api/posts/route.ts', 'utf-8');

    it('should return 500 on database query failure, not 200', () => {
      // Find the error response for query failures
      expect(postsRoute).toContain(
        "{ items: [], error: 'Failed to fetch posts' }, { status: 500 }"
      );
      // Should NOT return 200 on errors
      expect(postsRoute).not.toContain(
        "{ items: [], error: 'Failed to fetch posts' }, { status: 200 }"
      );
    });

    it('should return 500 on catch-all errors, not 200', () => {
      expect(postsRoute).toContain(
        "{ items: [], error: 'Internal server error' }, { status: 500 }"
      );
      expect(postsRoute).not.toContain(
        "{ items: [], error: 'Internal server error' }, { status: 200 }"
      );
    });
  });
});
