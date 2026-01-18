# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project snapshot

Organic App is a DAO-style community app for $ORG built with Next.js App Router, Supabase auth, and Solana wallet linking.
It enables tasks, proposals, voting, and token-gated features for the Organic DAO.

**What “done” means**
- Feature works locally (`npm run dev`)
- Production build passes (`npm run build`)
- Lint passes (`npm run lint`)
- Code formatted (`npm run format`)
- No obvious TypeScript issues
- Docs updated if behavior or flows changed

**This week**
- Working on: Improving app features and new wallet integrations
- Next: Enhance wallet connection UX, add multi-wallet support
- Blockers: none

## Operating rules

- Do NOT edit, log, or expose secrets from `.env.local`. Ask Cisco if env vars are missing.
- Never commit secrets, tokens, private keys, or service role keys.
- Prefer small, focused diffs.
- Ask before large refactors, renames, or folder restructures.
- If behavior changes, update this file or relevant docs (`BUILD_PLAN.md`).
- Do not modify Supabase RLS policies unless explicitly requested.
- Do not change Solana token verification logic unless explicitly requested.
- Keep backend logic out of UI components when possible.

## Quick navigation

**Start here**
- App Router root: `src/app/`
- Localized pages: `src/app/[locale]/`
- Global layout: `src/app/layout.tsx`
- Middleware (auth/session/i18n): `src/middleware.ts`
- Global styles: `src/app/globals.css`

**Core workflows**
- Auth state + profile: `src/features/auth/`
- Profile management: `src/features/profile/`
- Organic ID / wallet linking: `src/features/organic-id/`
- Tasks: `src/features/tasks/`
- Proposals: `src/features/proposals/`
- Voting: `src/features/voting/`
- Sprints: `src/features/sprints/`
- Notifications: `src/features/notifications/`

**UI**
- Shared UI primitives (shadcn): `src/components/ui/`
- Feature UI:
  - Auth: `src/components/auth/`
  - Tasks: `src/components/tasks/`
  - Proposals: `src/components/proposals/`
  - Voting: `src/components/voting/`
  - Sprints: `src/components/sprints/`
  - Notifications: `src/components/notifications/`
- Navigation: `src/components/navigation.tsx`
- Locale switcher: `src/components/locale-switcher.tsx`

**Internationalization (i18n)**
- i18n config: `src/i18n/`
- Translation files: `messages/` (en.json, pt-PT.json, zh-CN.json)

**Utilities**
- Hooks: `src/hooks/`
- Lib/helpers: `src/lib/`
- Config: `src/config/`

**API**
- API routes: `src/app/api/`

**Database**
- Supabase migrations: `supabase/migrations/`
- Supabase edge functions (if used): `supabase/functions/`
- Generated DB types: `src/types/`

## Dev workflow

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run format   # Prettier
