# Code Simplification Audit — 2026-05-13

## Scope

Repo-wide maintenance pass covering:

- Current documentation and project information files
- TypeScript unused locals and unused parameters
- Obvious dead private helpers/components
- Regression validation with lint, unit tests, and production build

This pass avoided auth/session/wallet verification logic, RLS policies, public API contract redesigns, and broad folder moves.

## Baseline

Initial validation before edits:

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm test` | Pass — 133 tests |
| `npm run build` | Pass, with existing Sentry/OpenTelemetry and Supabase Edge Runtime dependency warnings |
| `npx tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false` | Failed with unused locals/parameters across app, API, components, features, scripts, and tests |

## Findings

### Documentation drift

- `BUILD_PLAN.md` still marked `/wallets.json` and AGPL licensing as not started.
- `PROJECT_CONTEXT.md` listed the shipped `/wallets.json` and AGPL license tasks as still open.
- `PROJECT_CONTEXT.md` still referenced 89 unit tests; the current unit suite reports 133 tests.
- `README.md` had a stale platform status date and listed Plausible as the analytics stack even though the app uses internal analytics/market data surfaces.

### Unused code

The strict TypeScript unused pass found:

- Unused icon imports and local variables in app pages and UI components.
- Unused framework route parameters in API handlers.
- Unused local helper components in the community profile page.
- An unused private `createReferral` helper in the referral engine.
- Unused locals in scripts and security/Playwright tests.
- A dead token market strip helper in `kpi-cards.tsx`; the active analytics page uses the governance KPI and trust panels.

### Remaining larger work

- `src/types/database.ts` regeneration from live schema remains the highest-leverage type cleanup. It should close many existing `as any` casts, but it requires Supabase schema access and should be handled as a dedicated task.
- `/tasks/[id]` still builds at 334 kB first-load JS. The recommended fix remains dynamic-importing below-the-fold sections.
- Build warnings from Sentry/OpenTelemetry dynamic requires and Supabase Edge Runtime imports remain dependency-level warnings, not regressions from this cleanup.

## Changes Applied

- Updated `README.md`, `BUILD_PLAN.md`, `PROJECT_CONTEXT.md`, and `SESSION_LOG.md`.
- Removed unused imports, constants, locals, and dead private helpers.
- Renamed unused route parameters to `_request` where the framework signature is retained.
- Removed unused props from local component contracts where the prop was not rendered or used.
- Left historical audit files intact and added this current audit note instead of rewriting dated evidence.

## Validation

Final validation after edits:

| Check | Result |
|---|---|
| `npx tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass |
| `npm run build` | Pass |

The build still reports the same dependency warnings described in the baseline.
