import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // `server-only` throws on import outside an RSC environment. Vitest is
      // not RSC, so alias to an empty module — the real guard still runs at
      // Next build time. See tests/mocks/server-only.ts.
      'server-only': path.resolve(__dirname, 'tests/mocks/server-only.ts'),
    },
  },
  test: {
    // Scope Vitest to the directories that use Vitest-style tests. The rest of
    // the repo (src/features/**/__tests__, src/lib/__tests__, src/lib/translation/__tests__)
    // runs under `node --test` via `npm run test` and uses a different runner API.
    include: [
      'src/lib/solana/__tests__/**/*.test.ts',
      'src/app/api/**/__tests__/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/features/**/*.test.ts',
    ],
  },
});
