// vitest alias target for `server-only`. The real package throws on import
// from non-RSC environments (which is the whole point — it stops accidental
// browser bundling). Vitest doesn't run inside an RSC environment, so server
// modules under test would always trip it. This empty no-op preserves the
// build-time guard while letting unit tests import the same modules directly.
export {};
