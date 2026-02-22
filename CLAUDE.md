# CLAUDE.md

Operational instructions for Claude Code in this repository.

Keep this file short, stable, and execution-focused.

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

## Project snapshot

Organic App is a DAO-style platform built with Next.js App Router, Supabase, and Solana wallet linking.

Core domains: auth, tasks, proposals, voting, sprints, members, notifications, reputation, analytics, treasury.

## Claude non-negotiables

- Never expose secrets from `.env.local`.
- Never commit secrets, private keys, or service-role credentials.
- Do not weaken auth/session/wallet verification behavior without explicit approval.
- Do not modify Supabase RLS policies unless explicitly requested.
- Keep Solana token checks server-validated.
- Prefer small, focused diffs over broad refactors.
- Ask before changing public APIs, route contracts, or DB schema strategy.
- Do not change npm scripts without approval.

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

## Execution playbook

For each task:

1. Restate the goal in one sentence.
2. Note assumptions only when needed.
3. Identify the minimal file set to edit.
4. Keep business logic in feature modules, UI in components, orchestration in API routes.
5. Use Zod for external input validation.
6. Maintain strict typing; avoid introducing `any`.
7. Validate with repo scripts before handoff when change impact warrants it.
8. Report exactly what changed and where.

## Validation matrix

Run checks proportional to risk.

General code changes:

- `npm run lint`
- `npm run build` for important or cross-cutting changes

UI/i18n changes:

- Validate translated keys exist for affected namespaces
- Verify localized navigation/routes still resolve
- Manual check on desktop and mobile for touched screens

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

## Maintenance rule

Do not add milestone logs, release notes, or phase-by-phase status to `CLAUDE.md`.

Keep `CLAUDE.md` as stable operational guidance only.
