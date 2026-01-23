# CLAUDE.md

This file defines how Claude Code should work in this repository.

## Project snapshot

Organic App is a DAO-style community app for $ORG built with Next.js 14 App Router, Supabase (Postgres + Auth), and Solana wallet linking.
Core domains: tasks, proposals, voting, sprints, notifications, profiles, Organic ID.

## Agents

Claude agents are defined in: agents/claude.md
Repo wide agent rules live in: AGENTS.md

## Definition of done

A change is done when:

- Feature works locally: `npm run dev`
- Lint passes: `npm run lint`
- Build passes for important changes: `npm run build`
- Formatting is clean: `npm run format`
- No obvious TypeScript issues
- Docs updated if behavior, flows, or assumptions changed

## Hard rules (never break)

Security and secrets

- Never print, log, paste, or expose secrets from .env.local.
- Never commit secrets, tokens, private keys, or Supabase service role keys.
- If env vars are missing, ask Cisco and explain what is required.

Supabase and Solana

- Do not modify Supabase RLS policies unless explicitly requested.
- Do not change token verification or wallet linking logic unless explicitly requested.
- Any wallet related change must keep signature verification strict.

Change discipline

- Prefer small focused diffs.
- Ask before large refactors, renames, moving folders, or changing public APIs.
- Keep domain logic out of UI components when possible.

## Architecture rules

Separation of concerns

- UI components: src/components only
- Domain logic and hooks: src/features
- Cross cutting utilities: src/lib and src/hooks
- Route handlers (src/app/api) orchestrate only, no heavy business logic

Data access

- React Query owns caching and invalidation for client data flows.
- Zod validates all external input (API requests, forms, query params).

## Workflow for every task

Before coding

1. Restate goal in 1 sentence.
2. List assumptions (if any).
3. Propose a plan (3 to 7 bullets) with file paths.

While coding

- Make minimal diffs.
- Prefer adding small helper functions in src/features over stuffing logic in components.
- Add tests when logic is critical or easy to cover.

After coding

- Provide commands to verify.
- Mention any follow ups or risks.

## Plan mode contract (required)

For any non-trivial task, Claude must start in Plan mode.

In Plan mode Claude must:

- Not edit files
- Ask only questions needed to remove ambiguity (max 5)
- Propose a small plan (3–7 bullets) with file paths
- Include verification steps (commands + manual checks)
- Explicitly wait for approval before implementing

Claude must end Plan mode responses with:
"Say 'go' to implement, or tell me what to change in the plan."

## Output format (required)

Always respond with:

1. Plan
2. Changes (what and where)
3. How to verify (commands + manual checks)

## Quick navigation

Start

- App Router root: src/app/
- Localized routes: src/app/[locale]/
- Root layout: src/app/[locale]/layout.tsx
- Middleware: src/middleware.ts
- Global styles: src/app/[locale]/globals.css

Domains

- Auth: src/features/auth/
- Profile: src/features/profile/
- Organic ID: src/features/organic-id/
- Tasks: src/features/tasks/
- Proposals: src/features/proposals/
- Voting: src/features/voting/
- Sprints: src/features/sprints/
- Notifications: src/features/notifications/

UI

- Shared UI (shadcn): src/components/ui/
- Feature UI: src/components/{auth,notifications,proposals,sprints,tasks,voting,wallet}/
- Navigation: src/components/navigation.tsx
- Locale switcher: src/components/locale-switcher.tsx
- Language selector: src/components/language-selector.tsx

i18n

- i18n config: src/i18n/
- Translations: messages/ (en.json, pt-PT.json, zh-CN.json)

API and DB

- API routes: src/app/api/
- Migrations: supabase/migrations/
- Edge functions: supabase/functions/
- Generated types: src/types/

Shared libs and assets

- Supabase clients: src/lib/supabase/
- Shared utilities: src/lib/utils.ts
- Public assets: public/assets/

## Commands

npm run dev
npm run lint
npm run build
npm run format
