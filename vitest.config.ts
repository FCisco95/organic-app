import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
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
