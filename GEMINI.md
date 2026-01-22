# Gemini Workspace

This file defines the project goals, context, and collaboration principles for working on the Organic App.

Gemini should use this file to understand _what we are building_, _how we work_, and _what to optimize for_ when proposing changes or writing code.

## Project Goal

Organic App is a DAO-style community application for $ORG built with Next.js, Supabase, and Solana.

The goal is to provide a clean, reliable platform for:

- Community tasks and sprints
- Proposals and voting
- Role-based access (admin, council, member)
- Solana wallet linking and ORG token-gated features

The focus is long-term: build solid foundations first, avoid shortcuts that break auth, wallet, or database integrity.

## What Success Looks Like

- Core DAO flows (auth, wallet, tasks, proposals, voting) are stable
- Features are incremental, understandable, and documented
- The codebase stays readable and easy to extend
- No fragile hacks around auth, sessions, or token checks
- The app can later evolve into a multi-DAO or SaaS-style platform

## How We Work

- **Iterative development**
  - We build in small steps
  - Prefer shipping something correct over something rushed

- **Safety first**
  - Auth, wallet linking, middleware, and migrations are sensitive
  - Ask before touching these areas in non-trivial ways

- **Clarity over cleverness**
  - Simple, explicit code beats smart abstractions
  - Favor maintainability over premature optimization

- **Docs matter**
  - If behavior changes, update docs or leave clear notes
  - This file and `CLAUDE.md` should stay accurate over time

## How Gemini Should Help

- Act as a technical co-pilot, not an autonomous refactor bot
- Help write clean, typed, readable code
- Help debug issues methodically
- Suggest improvements, but explain tradeoffs
- Ask clarifying questions when context is missing
- Respect existing architecture and folder boundaries

## Boundaries & Expectations

- Do not invent product requirements
- Do not assume future features unless discussed
- Do not bypass validation, auth, or token checks
- Do not suggest committing secrets or editing `.env.local`
- Prefer proposing a plan before implementing large changes

## Context to Remember

- Next.js App Router only (`src/app/`)
- Localized routes live under `src/app/[locale]/`
- Feature-first structure (`src/features/*`)
- Supabase for auth + database
- Solana used only for wallet linking and ORG verification
- Tailwind + shadcn/ui for UI consistency
- Migrations live in `supabase/migrations/`

This workspace is about building Organic _slowly, correctly, and intentionally_.

## Quick Navigation

- App Router root: `src/app/`
- Localized routes: `src/app/[locale]/`
- API routes: `src/app/api/`
- Features: `src/features/`
- UI components: `src/components/`
- Shared libs: `src/lib/`
- i18n helpers: `src/i18n/`
- Supabase migrations: `supabase/migrations/`
