# Session Log

Add newest entries at the top.

## 2026-01-22 (Session 2)

- Aligned documentation paths with locale-based App Router structure
- Added localized auth error page and translations (en, pt-PT, zh-CN)
- Localized remaining hardcoded UI strings and accessibility labels
- Updated shadcn components config to point at localized globals
- Ran lint to verify changes (`npm run lint`)

## 2026-01-22

### Security: Server-side Nonce Validation
- Created `wallet_nonces` migration with 5-minute TTL and RLS policy
- Updated `/api/auth/nonce` to store nonces in database
- Updated `/api/auth/link-wallet` to validate, verify expiry, and consume nonces
- Added TypeScript types for `wallet_nonces` table
- Prevents replay attacks on wallet signature verification

### Performance: Solana RPC Caching
- Added server-side balance cache (30s TTL) in `/api/organic-id/balance`
- Added client-side balance cache (15s TTL) in profile page
- Logs cache hits vs RPC calls for debugging
- Prevents 429 rate limit errors from excessive RPC calls

### Wallet Flow
- Fixed wallet switch flow by sequencing select -> connect through wallet context
- Guarded against concurrent connect attempts and cleared walletName on disconnect

### Documentation
- Updated BUILD_PLAN.md with reliability tasks and recent updates
- Added infrastructure TODO: replace public Solana RPC with paid provider

## 2026-01-21 (Session 4)

- Performed code review of auth and wallet system
- Identified critical issues: nonce not validated server-side, state desync on wallet switch
- Identified high priority issues: no wallet update flow, race condition in Organic ID assignment
- Ran pre-commit review on pending documentation changes
- Added agent configuration files (agents/claude.md, docs/agents-prompts.md)
- Updated CLAUDE.md with agents section reference

## 2026-01-21 (Session 3)

- Removed React Hook dependency warnings by memoizing async loaders
- Replaced profile avatar `<img>` with `next/image` to clear lint warning
- Updated wallet UI translations and aligned Phase 13 wallet adapter status in build plan

## 2026-01-21 (Session 2)

- Localized wallet drawer/connect UI strings across en, pt-PT, and zh-CN
- Routed wallet UI labels through the Wallet translation namespace
- Updated BUILD_PLAN Phase 13 wallet adapter status (Solflare/Coinbase/Ledger/Torus)

## 2026-01-21

- Replaced wallet connect UX with a side drawer and nav-only entry point
- Added wallet change/connect fixes (first-click connect, no blink on change)
- Added auto-reconnect on locale change and improved wallet mismatch handling
- Added balance fetching guards, caching, and request cancellation for linked wallets
- Updated wallet-related translations (en, pt-PT, zh-CN)

## 2026-01-18 (Session 3)

- Performed folder structure audit
- Updated CLAUDE.md "This week" section: improving app features and new wallet integrations
- Updated CLAUDE.md Quick navigation with new i18n and utility paths
- Added accessible LanguageSelector dropdown component with keyboard navigation
- Added languageConfig to centralize locale metadata (code, name, flag)
- Refactored LocaleSwitcher to use new LanguageSelector component
- Updated BUILD_PLAN.md with Phase 5.5: Internationalization (Completed)
- Committed changes with granular commits and pushed to main

## 2026-01-18 (Session 2)

- Fixed i18n locale switching not updating translations
- Updated `src/app/[locale]/layout.tsx` to use `getMessages()` from `next-intl/server`
- Added `setRequestLocale()` for proper server-side locale handling
- Added complete translations for Home and Profile pages (en, pt-PT, zh-CN)
- Expanded message files with ~100 keys per language
- Committed and pushed all i18n changes

## 2026-01-18 (Session 1)

- Session opened and closed (no code changes)
- Verified working tree clean after i18n implementation
- All previous work committed

## 2026-01-17

- Added internationalization (i18n) support with next-intl
- Created `src/app/[locale]/` route structure for localized pages
- Added locale switcher component (`src/components/locale-switcher.tsx`)
- Set up i18n configuration in `src/i18n/`
- Migrated pages to locale-aware routing (auth, tasks, proposals, sprints, profile, leaderboard)
- Updated navigation component for i18n support
- Updated middleware for locale detection
- Modified next.config.js for i18n plugin
- Updated package.json with next-intl dependency
