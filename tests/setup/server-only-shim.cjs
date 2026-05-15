// Loader shim for `node --test` so it can import server-only modules.
//
// The `server-only` package throws on import outside an RSC environment —
// that's the whole point: it stops accidental browser bundling. Vitest aliases
// it via vitest.config.ts. The node:test runner has no equivalent and tsx
// transforms .ts to CJS, so we patch CJS resolution to stub `server-only`
// out for tests only. Production builds still see the real package and get
// the real guard.
const Module = require('node:module');
const path = require('node:path');

const stub = path.resolve(__dirname, 'server-only-stub.cjs');
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, ...args) {
  if (request === 'server-only') {
    return stub;
  }
  return originalResolve.call(this, request, ...args);
};
