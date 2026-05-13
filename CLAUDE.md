# CLAUDE.md

**Project:** Organic Hub — a DAO-style platform built with Next.js App Router, Supabase, and Solana wallet linking. Core domains: auth, tasks, proposals, voting, sprints, members, notifications, reputation, analytics, treasury. Live at organichub.fun.

Operational instructions for Claude Code in this repository. Keep this file short, stable, and execution-focused.

## Authority and scope

Follow instruction precedence in this order:

1. `AGENTS.md` (primary repo rules)
2. `CLAUDE.md` (Claude-specific operating guidance)
3. `GEMINI.md` (project goals and collaboration principles)

Scope of this file:

- How Claude should operate in this repo
- High-signal architecture map and guardrails
- Validation expectations by change type

Out of scope for this file:

- Feature release notes
- Phase progress tracking
- Session history
- Large status audits

Use these files instead:

- `SESSION_LOG.md` for chronological work logs
- `BUILD_PLAN.md` for roadmap and phase status
- `README.md` for onboarding and setup context

## Claude non-negotiables

- Never expose secrets from `.env.local`.
- Never commit secrets, private keys, or service-role credentials.
- Do not weaken auth/session/wallet verification behavior without explicit approval.
- Do not modify Supabase RLS policies unless explicitly requested.
- Keep Solana token checks server-validated.
- Prefer small, focused diffs over broad refactors.
- Ask before changing public APIs, route contracts, or DB schema strategy.
- Do not change npm scripts without approval.
- Make surgical changes only. Touch only files required by the task. If you spot unrelated issues (bugs, smells, dead code), **report them in your summary** — do not fix them in the same change.

## Destructive command safety

Never run any of these without explicit user confirmation in the current session:

- `rm -rf`, `rm` on directories, or any recursive delete
- `git push --force` (use `--force-with-lease` only when explicitly approved)
- `git reset --hard`, `git clean -fd`, branch deletion (`git branch -D`, `git push origin --delete`)
- `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, or any destructive SQL
- `npm uninstall`, dependency downgrades, lockfile rewrites
- Killing processes or modifying CI workflows

If you are unsure whether a command is destructive or reversible, **ask before running it**. The cost of asking is one prompt; the cost of a wrong delete is hours of recovery.

## Test account for browser QA

When you need to log in to the app for testing or QA, use this account:

- **Email:** `claude-test@organic-dao.dev`
- **Password:** `OrganicTest2026!`
- **Role:** admin (organic_id: 999)
- **Auth state file:** run `playwright-cli state-load auth.json` if a saved session exists

This account has full admin access to all pages and features.

## Reading large files

When reading large files, run `wc -l` first, to check the line count. If the file is over 2000 lines, use the `offset`and `limit` parameters on the Read tool to read in chunks rather than attempting to read the entire file at once.

## Worktree strategy

Use git worktrees for parallel work streams:

| Worktree   | Branch Pattern | Purpose                  |
| ---------- | -------------- | ------------------------ |
| main repo  | `main`         | Stable base, PR merges   |
| worktree-1 | `phase/*`      | Feature development      |
| worktree-2 | `fix/*`        | Bug fixes (parallel)     |
| worktree-3 | `docs/*`       | Documentation (parallel) |

Use the `using-git-worktrees` skill to create worktrees. Clean up worktrees after merging.

## GitHub phase workflow (required)

- Start each new phase by creating and switching to a new branch before editing files.
- Do not implement phase work directly on `main` unless explicitly approved.
- Keep one phase per branch to avoid mixed concerns in PRs.
- Preferred branch naming:
  - `phase/<phase-id>-<short-scope>`
  - `fix/<short-scope>`
  - `docs/<short-scope>`
- Required start commands:
  1. `git switch main`
  2. `git pull --ff-only`
  3. `git switch -c <branch-name>`
- Required delivery flow:
  1. Commit focused changes.
  2. `git push -u origin <branch-name>`
  3. Open PR and ensure required checks pass.
  4. Merge only when CI is green and feedback is resolved.
- Required cleanup after merge:
  1. `git switch main`
  2. `git pull --ff-only`
  3. Delete merged branches locally and remotely.
- Avoid `git push --force` unless explicitly approved.

## UX/UI work rules

Any request involving UI, UX, design, layout, copy, interactions, or visual behavior must follow these rules:

- **Always ask first.** Before writing any UI code or making any design decisions, ask clarifying questions. Do not assume intent, layout preference, interaction pattern, copy, color treatment, or component choice.
- **Use organic-ux skills.** All UX/UI work must draw from the project's `organic-ux` skill/document (see `docs/organic-ux.md` or equivalent when available). This defines the design language, component patterns, motion, spacing, and tone for this project.
- **Minimum questions before any UI task:**
  1. What is the goal or user need this UI change serves?
  2. Which surface/screen does it affect, and who sees it?
  3. Are there existing components or patterns to reuse?
  4. Any specific visual or interaction constraints?
- **Never guess on:** layout structure, icon choice, copy/labels, color variants, empty states, loading states, error states, or mobile behavior. Ask if unclear.
- After gathering answers, confirm your intended approach before building.

## QA and revamp pipeline

Any request to test, QA, or revamp a section follows this three-phase pipeline:

1. **`manual-tester`** — live headed-browser QA with expert UX analysis benchmarked against best-in-class apps → save plan file
2. **`qa-fixer`** — surgical S0/S1 bug fixes with browser verification → clean working base (same session OK)
3. `/clear` (context boundary)
4. **`prototype-executor`** — load plan → 3 benchmark-driven worktree prototypes → user comparison → iterate → merge

Never skip the `/clear` before prototype-executor. The qa-fixer can run in the same session as manual-tester.

## Collaborative questioning (Level 2)

Before executing any non-trivial task, ask:

- "What am I missing here?" — surface blind spots.
- "What are the unintended consequences?" — catch side effects early.
- "What would an expert [domain] think about this?" — elevate the approach.

Push back on user assumptions when something looks off. Be adversarial when asked.

## Corrections log

When the user corrects your approach or points out a mistake — especially one that would recur in future sessions — write a short note to `.claude/memory/feedback_<topic>.md` capturing:

- The rule (one line)
- **Why:** the reason given
- **How to apply:** when this kicks in

Update `.claude/memory/MEMORY.md` with a one-line index entry. Do not duplicate corrections already saved.

## Context window discipline (Level 3)

- The dead zone starts at ~50-60% context usage. Watch the statusline.
- Prefer `/clear` over `/compact`. If a conversation is critical, summarize it explicitly first, then paste into the new session.
- Don't pre-load massive context. Claude has access to the full codebase — nudge, don't dump.
- Use few-shot examples over long prose instructions when possible.

## Execution playbook

For each task:

1. Restate the goal in one sentence.
2. State assumptions explicitly before writing code. If any assumption is load-bearing and unverified, ask first.
3. Identify the minimal file set to edit.
4. Define verifiable success criteria up front: which command, test, or browser check will prove the change works. Run it before claiming completion.
5. Keep business logic in feature modules, UI in components, orchestration in API routes.
6. Prefer simplicity over cleverness. If a function exceeds ~50 lines or a file exceeds ~800 lines while you're editing it, flag the threshold to the user and propose a refactor — do not silently absorb the bloat. Do not refactor unrelated code.
7. Use Zod for external input validation.
8. Maintain strict typing; avoid introducing `any`.
9. Validate with repo scripts before handoff when change impact warrants it.
10. Report exactly what changed and where.

## Testing (non-negotiable)

Every code change must have corresponding tests. Do not skip testing even if not explicitly asked.

- **Security changes** (auth, input validation, RLS, privacy): always add or update tests in `tests/security/`
- **Utility functions**: unit test inputs, edge cases, and attack vectors
- **API routes**: test that auth enforcement, error codes, and data filtering work correctly
- **Bug fixes**: write a regression test that would have caught the bug
- Run `npx vitest run tests/security/` after security changes
- Run `npm run test` after feature module changes
- All tests must pass before marking work complete

## Validation matrix

Run checks proportional to risk.

General code changes:

- `npm run lint`
- `npm run build` for important or cross-cutting changes
- `npx vitest run` for any changed modules with test coverage

UI/i18n changes:

- Validate translated keys exist for affected namespaces
- Verify localized navigation/routes still resolve
- Manual check on desktop and mobile for touched screens
- Keep `docs/qa-runbook.md` aligned when workflows/routes are added or changed

API route changes:

- Confirm auth/role enforcement remains correct
- Confirm Zod validation covers external inputs
- Confirm error responses are safe and actionable

Database/migration changes:

- Ensure migration is incremental and reversible
- Confirm compatibility with existing data/queries
- Do not alter RLS/auth semantics without explicit approval

Wallet/token/auth changes:

- Preserve strict signature and session validation
- Keep token-holder checks server-side
- Require explicit human confirmation before non-trivial changes

## Ask-before-changing gates

Ask for confirmation before:

- Auth/session/wallet flow changes
- Supabase RLS or permission model changes
- Large refactors, file moves, or folder renames
- Public API contract changes
- Cross-domain migrations or data model redesign

## Architecture and commands

See `AGENTS.md` for the full folder map and standard command reference (`npm run dev/lint/build/format`).

## Living references

- Repo rules: `AGENTS.md`
- Project principles: `GEMINI.md`
- Agent role adapter: `agents/claude.md`
- Session history: `SESSION_LOG.md`
- Roadmap/progress: `BUILD_PLAN.md`
- Product reality snapshot: `PROJECT_CONTEXT.md`
- Manual QA baseline: `docs/qa-runbook.md`
- Design specs (north-star architecture): `docs/superpowers/specs/`
  - V2 strategic frame: `docs/superpowers/specs/2026-05-11-multi-tenant-platform-readiness-design.md` — multi-tenant platform readiness, four-layer architecture, 13 locked decisions, 11 sub-sessions
- Implementation plans per sub-session: `docs/superpowers/plans/`
- Path-scoped rules: `.claude/rules/`
  - General: `api.md`, `frontend.md`, `database.md`
  - Common: `common/{patterns,code-review,agents}.md`
  - TypeScript: `typescript/{coding-style,patterns}.md`
  - Web: `web/{coding-style,design-quality,patterns,performance,security,testing}.md`
- Apply the rule file matching the area you're editing. When multiple apply, the more specific (web > common) wins.

### Where things go

- **Strategic architecture** (north-star, multi-decision frames): `docs/superpowers/specs/<date>-<topic>-design.md`
- **Implementation plans** (file paths, migration SQL, sequencing): `docs/superpowers/plans/<date>-<topic>.md` — produced via `superpowers:writing-plans`
- **QA / revamp plans** (one per surface): `docs/plans/<date>-<topic>-revamp.md`
- **Audit reports** (security/performance/typescript/coverage one-offs): `docs/audits/<date>-<topic>.md`
- **Session notes**: `SESSION_LOG.md` (chronological, newest first; rotate to `docs/session-log-archive.md` when bloated)
- **Roadmap status**: `BUILD_PLAN.md`
- **Product reality**: `PROJECT_CONTEXT.md`
- **Memories** (cross-session knowledge): `~/.claude/projects/-Users-cisco-Desktop-projects-organic-app/memory/` — index in `MEMORY.md`

## Maintenance rule

Do not add milestone logs, release notes, or phase-by-phase status to `CLAUDE.md`.

Keep `CLAUDE.md` as stable operational guidance only.
