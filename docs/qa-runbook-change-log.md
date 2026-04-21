# QA Runbook — Change Log

A short history of what changed in `docs/qa-runbook.md`. Oldest entry at the bottom.

---

## 2026-04-21 — Full revamp to match live production

**Rewrote** `docs/qa-runbook.md` end-to-end. Old file (721 lines) predated Pulse, Vault, Posts, Easter campaign, Translation toggles, For-projects, and Trophies.

### Added sections
- **4.4 Pulse** (analytics hub) — new primary landing for metrics; captures historical S1s: tab bar overflow at 375px, sub-44px DexScreener/GeckoTerminal buttons. References PR #63 for concentration-bars + distribution-summary restoration.
- **4.5 Vault** (treasury) — replaces `/treasury`, which is now a redirect.
- **4.13 Posts** — documents the points-economy feed shipped in phase 30: post cost, engagement XP, flagging, and the persistent S0 skeleton-forever for unauthed visitors. Includes `Organic` filter-pill overflow and sub-44px sort/filter pills.
- **4.22 For-projects** — marketing route.
- **4.23 Easter campaign** — egg hunt launched 2026-04-05, covers `/share/egg/[number]`, collection UI, reduced-motion behavior.
- **4.24 Translation toggles + content translation** — admin per-type toggles (posts, proposals, ideas, tasks), DeepL path, Supabase cache, comments-excluded scope.
- **4.26 Marketplace** — flag-gated boosts surface. Documents tab wrap and height-consistency S1 from Iter 1 mobile QA.
- **Trophies** block inside 4.7 for `/profile/trophies` (rarity filter chips, By Category/By Set toggles).
- **Harvest** block inside 4.12 for `/ideas/harvest`.
- **Translation toggle line items** (`XLT-*` plus cross-refs) in Posts, Proposals, Ideas, and Tasks.
- **Users table** item (`ADM-09`) in Admin Ops (8-col mobile fallback, action-button touch targets).

### Changed
- Rename-flagged old redirects so `/treasury`, `/analytics`, `/quests`, `/rewards`, `/leaderboard`, `/members`, `/members/[id]` all appear in the page matrix as explicit redirect rows — prevents accidentally dropping them.
- Merged the old 4.6 Quests + 4.11 Rewards sections into 4.8 (via `/earn` canonical) + 4.15 (via admin rewards) to match the live IA where `/earn` is the member-facing canonical route.
- Replaced the old `AUTH-11` callback case (redundant — consolidated into generic callback behavior) and reduced auth use-cases from 12 to 11 to reflect current auth surface.
- Added **`Last verified: YYYY-MM-DD`** to every section so drift is visible at a glance.
- Bumped mobile viewport recommendations to 390×844 (iPhone 13) + 412×915 (Pixel 7) per mobile-audit plan.

### Removed
- Old granular 2026-03-xx PASS/FAIL inline results — they were historical artifacts, now summarized in each section's "last verified" line + "historical S1" bullets. Full detail remains in `docs/plans/2026-03-21-*-qa-revamp.md` for archaeology.
- `pt-PT` as a primary test locale — confirmed not shipping in the live locale selector. Retained a note to confirm before any future testing.

### Cross-check
Every `NavItem` in `src/components/layout/nav-config.ts` (main, admin, utility) has a matching row in section 5's matrix as of 2026-04-21.

---
