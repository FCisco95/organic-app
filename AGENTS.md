# AGENTS.md

Repository-wide operating rules for any automated coding agent working in this codebase.

When uncertain, stop and ask.

## Authority and precedence

Instruction precedence inside this repo:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `GEMINI.md`

`AGENTS.md` defines durable, cross-agent rules.
Do not use this file for milestone logs, roadmap status, or session notes.

## Project architecture map

App layer:

- `src/app/[locale]/` localized Next.js App Router pages/layouts
- `src/app/api/` route handlers

Domain layer:

- `src/features/` feature-first business logic, hooks, schemas, and types

UI layer:

- `src/components/` UI components only
- `src/components/ui/` shadcn/ui primitives

Shared layer:

- `src/lib/` shared integrations/helpers (Supabase, Solana, utils)
- `src/hooks/` shared hooks
- `src/config/` app configuration and constants
- `src/types/` shared/generated TypeScript types
- `src/i18n/` localization helpers
- `messages/` translation files (`en.json`, `pt-PT.json`, `zh-CN.json`)

Data layer:

- `supabase/migrations/` SQL migrations (incremental and reversible)
- `supabase/functions/` edge functions

Assets:

- `public/` static files only

## Engineering standards

- TypeScript/TSX only.
- Next.js App Router patterns only.
- Use Zod for external input validation (API/form/query params).
- Avoid `any`; prefer strict typing and explicit return types.
- Keep functions and modules small and readable.
- Keep business logic out of UI components.

Naming:

- React components: `PascalCase`
- Hooks: `useSomething`
- Feature folders: lowercase or kebab-case
- Files: lowercase, kebab-case where appropriate

## Security and sensitive areas

- Never commit or expose secrets/tokens/private keys.
- Treat `.env.local.example` as reference only.
- Do not log env variable values.
- Do not modify Supabase RLS policies unless explicitly instructed.
- Do not change auth/session/wallet verification logic without explicit approval.
- Solana token checks must remain server-validated.

## Change policy

- Prefer small, focused diffs.
- Avoid drive-by refactors or mixed concerns in one change.
- Do not change npm scripts without approval.
- Do not rename/move broad folder structures without approval.
- Route handlers should orchestrate; heavy domain logic belongs in `src/features/`.

## GitHub workflow (phase-based)

- Start every new phase on a dedicated branch from an up-to-date `main`.
- Do not start phase work directly on `main` unless explicitly approved.
- Use clear branch names:
  - `phase/<phase-id>-<short-scope>` for planned phase work
  - `fix/<short-scope>` for bug fixes
  - `docs/<short-scope>` for documentation-only work
- Required start sequence:
  1. `git switch main`
  2. `git pull --ff-only`
  3. `git switch -c <branch-name>`
- Required delivery sequence:
  1. Keep commits small and scoped to the phase.
  2. `git push -u origin <branch-name>`
  3. Open a PR and run required checks.
  4. Merge only after checks pass and review feedback is addressed.
- Required post-merge cleanup:
  1. `git switch main`
  2. `git pull --ff-only`
  3. `git branch -d <branch-name>`
  4. `git push origin --delete <branch-name>`
- If uncommitted changes block branch switching, commit them on the active branch or stash intentionally before starting the new phase branch.
- Avoid `git push --force` unless explicitly approved.

## Validation policy

Minimum validation for meaningful code changes:

- `npm run lint`
- `npm run build`

Also run targeted manual checks for touched flows (UI/API/auth/roles/i18n).

If adding tests:

- Co-locate with feature code, e.g. `src/features/tasks/__tests__/task-create.test.ts`

## Documentation policy

Update docs when behavior or assumptions change:

- `README.md` for setup/usage changes
- `CLAUDE.md` for Claude-specific operating guidance
- `BUILD_PLAN.md` for roadmap/progress changes
- `SESSION_LOG.md` for chronological session notes

## Commit and PR expectations

Commits:

- Short, imperative, sentence case
- Example: `Add task creation API`

Pull requests:

- Small, focused diff
- Clear summary of what changed and why
- Screenshots for UI changes when applicable
- Mention risks and migration impact when relevant

## Ask-before-changing gates

Get explicit confirmation before:

- Auth/session/wallet flow changes
- RLS/permissions model changes
- Public API contract changes
- Cross-domain schema redesigns
- Large refactors, renames, or folder moves

## Command reference

- `npm run dev` — local development
- `npm run lint` — lint checks
- `npm run build` — production build validation
- `npm run format` — formatting
