# AGENTS.md

This document defines repository-level rules and expectations for any automated agent or AI system working in this codebase.

Agents must follow these guidelines strictly. When unsure, stop and ask.

## Project Structure & Module Organization

- `src/app/`
  - Next.js App Router pages, layouts, and API routes
  - Route segments: `auth`, `login`, `signup`, `profile`, `tasks`, `proposals`, `voting`, `sprints`, `leaderboard`
  - Global files: `layout.tsx`, `page.tsx`, `globals.css`

- `src/features/`
  - Feature-first domain logic
  - Examples: `auth/`, `tasks/`, `proposals/`, `voting/`, `sprints/`, `notifications/`, `organic-id/`
  - Business logic, data access, and feature-specific helpers live here

- `src/components/`
  - UI components only
  - `src/components/ui/` contains shadcn/ui primitives
  - Feature UI lives in subfolders matching feature names
  - Avoid placing business logic here

- `src/lib/`
  - Shared libraries (Supabase, Solana, helpers)

- `src/hooks/`
  - Shared React hooks

- `src/config/`
  - App configuration and constants

- `src/types/`
  - Shared and generated TypeScript types

- `public/`
  - Static assets only

- `supabase/migrations/`
  - SQL migrations tracked in git
  - Migrations must be incremental and reversible

## Build, Test, and Development Commands

Agents should validate changes locally using:

- `npm run dev`
  - Start local dev server at `http://localhost:3000`

- `npm run build`
  - Validate production build

- `npm run lint`
  - ESLint with Next.js core-web-vitals rules

- `npm run format`
  - Prettier formatting

Do not add or change scripts without approval.

## Coding Style & Naming Conventions

- TypeScript and TSX only
- Use Next.js App Router patterns exclusively
- Avoid `any`; prefer strict typing and explicit return types
- Use Zod for API and form validation
- Keep functions small and readable

**Naming**
- React components: `PascalCase`
- Hooks: `useSomething`
- Feature folders: lowercase or kebab-case (`tasks`, `organic-id`)
- Files: lowercase with hyphens where appropriate

## Testing Guidelines

- Automated tests are not yet standardized
- Minimum checks before changes:
  - `npm run lint`
  - `npm run build`

- If adding tests:
  - Co-locate them inside the relevant feature folder
  - Example: `src/features/tasks/__tests__/task-create.test.ts`

## Commit & Pull Request Guidelines

- Commit messages:
  - Short, imperative, sentence case
  - Example: `Add task creation API`

- Pull requests:
  - Small, focused diffs
  - Clear description of what changed and why
  - Screenshots for UI changes when applicable
  - Update documentation when behavior changes

Avoid drive-by refactors or mixed concerns in a single PR.

## Security & Configuration Rules

- Use `.env.local.example` as a reference only
- Never commit secrets or tokens
- Do not log or expose env variables
- Do not modify Supabase RLS policies unless explicitly instructed
- Do not change auth, session, or wallet verification logic without approval
- Solana token checks must remain server-validated

## Authority & References

- **CLAUDE.md** defines operational rules and file navigation
- **GEMINI.md** defines project goals and collaboration principles

If instructions conflict:
1. Follow `AGENTS.md`
2. Then `CLAUDE.md`
3. Then `GEMINI.md`

When uncertain, pause and ask before acting.
