# Organic DAO Platform — Build Plan

For session-by-session implementation notes see `SESSION_LOG.md`.

---

## Current Status

### Gamification Revamp — 🔄 In Progress (2026-02-21)

Quest model, progress API, and grouped quest UI shipped. Source-context navigation wired.

- [x] Quest domain model + evaluator (`daily`, `weekly`, `long_term` objectives)
- [x] Quest progress API (`/api/gamification/quests`)
- [x] Grouped quest UI in progression shell (cadence columns, reset timers, CTA hints)
- [x] Source-context progression links from sidebar, top bar, profile, tasks, proposals
- [x] Members/profile readability + privacy-safe achievement gating
- [ ] Quest CTA deep-links and claim/reward affordances tied to completed objectives

### Wave 2 UI/UX Revamp — ✅ Complete (2026-02-21)

All 8 feature-vertical slices delivered and validated. Wave 2 is closed.

| Slice | Surface | Status |
|---|---|---|
| 1 | Tasks | ✅ Done |
| 2 | Proposals | ✅ Done |
| 3 | Sprints | ✅ Done |
| 4 | Disputes | ✅ Done |
| 5 | Rewards | ✅ Done |
| 6 | Members & Profile | ✅ Done |
| 7 | Notifications & Auth | ✅ Done |
| 8 | Admin Ops | ✅ Done |

Cross-feature consistency pass complete: `--transition-ui`, `--section-radius`, `--section-padding` tokens added to `globals.css`.

### Governance Integrity Program — ✅ Complete (Tasks 1–10)

Full release gate implemented. Final sign-off pending:
- [ ] Environment-capable E2E run (Supabase env vars + Playwright browser)
- [ ] Manual QA runbook (`docs/qa-runbook.md`)
- [ ] Sentry unresolved-error review

---

## Completed Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation (auth, wallet, Organic ID, profiles) | ✅ Done |
| 2 | Task Management (CRUD, kanban, submissions, review) | ✅ Done |
| 3 | Enhanced Profiles | ✅ Done |
| 4 | Navigation & UI Shell | ✅ Done |
| 5 | Infrastructure (middleware, SSR, auth flow) | ✅ Done |
| 5.5 | Internationalization (en, pt-PT, zh-CN) | ✅ Done |
| 6 | Sprint / Epoch Management | ✅ Done |
| 7 | Proposals System (wizard, lifecycle, voting) | ✅ Done |
| 8 | Treasury Dashboard | ✅ Done |
| 9 | Member Management & Admin Settings | ✅ Done |
| 10 | Analytics Dashboard | ✅ Done |
| 11 | Notifications & Communication (in-app, realtime, batching, voting reminders) | ✅ Done |
| 12 | Advanced Tasks (dependencies, subtasks, templates, recurring, delegation) | ✅ Done |
| 13 | Wallet Support (Solflare, Coinbase, Ledger, Torus, Backpack, OKX, etc.) | ✅ Done |
| 14 | Reputation & Gamification (XP, levels, achievements, streaks) | ✅ Done |
| 15 | Rewards & Distribution (claims, epoch pools, manual distributions) | ✅ Done |
| 16 | Dispute Resolution (3-tier, SLA, evidence, arbitration, XP effects) | ✅ Done |
| 19 | Launch Readiness (Zod hardening, E2E gate, Sentry, rate limiting, CI) | ✅ Done |

---

## Open / In Progress

### Gamification Revamp (Active)

- [ ] Quest CTA deep-links and claim/reward affordances tied to completed objectives

### Phase 2.1 — Task Management Hardening

- [ ] Complete remaining task i18n hardcoded string cleanup across all task surfaces
- [ ] Manual QA sweep for task user stories (discovery, self-join, review, mobile)

### Phase 7 — Proposals Remaining Items

- [ ] Proposal threshold gate (fixed or % supply)
- [ ] Anti-abuse: one live proposal per proposer + 7-day cooldown
- [ ] Execution window (3–7 days) + off-chain result handoff
- [ ] Proposal templates

### Phase 8 — Treasury Remaining Items

- [ ] Spending proposals (via existing proposal system)
- [ ] Multi-sig wallet integration (Squads or similar)
- [ ] Spending analytics

### Phase 9 — Members Remaining Items

- [ ] Member onboarding flow
- [ ] Organic ID minting interface

### Phase 10 — Analytics Remaining Items

- [ ] Treasury analytics
- [ ] Proposal success rates
- [ ] Export functionality

### Phase 11 — Notifications Remaining Items

- [ ] Email delivery via Resend (daily digest, respects preferences, React Email templates)
- [ ] System-wide announcements (admin/org level, not follow-based)
- [ ] Discord bot integration (planned later)
- [ ] Telegram bot integration (planned later)

### Phase 16 — Disputes Remaining Items

- [ ] Full manual pass for all Phase 16 user stories on staging/production data

---

## Roadmap

### Phase 17 — Integrations

- [x] Twitter/X engagement verification (OAuth, twitter task type, evidence)
- [ ] Discord bot (notifications, role sync)
- [ ] GitHub contribution tracking
- [ ] On-chain data verification (holdings/activity)

### Phase 18 — Platform Expansion

- [ ] White-label / multi-tenant support
- [ ] Custom branding and domain per tenant
- [ ] Open-core vs premium feature split

---

## Technical Improvement Backlog

### Performance

- [ ] Replace public Solana RPC with paid provider (Helius/QuickNode/Alchemy)
- [ ] Bundle size analysis and reduction
- [ ] Lazy loading for images

### Security

- [ ] CSRF protection review
- [ ] Security headers configuration
- [ ] Regular dependency updates

### Testing

- [ ] Unit tests for utility functions
- [ ] Component testing with React Testing Library
- [ ] Test coverage reporting

### Developer Experience

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Component Storybook
- [ ] Contribution guidelines

---

## Notes

- Maintain organic branding and design system across all new features
- Prioritize mobile responsiveness for all new features
- Target WCAG 2.1 AA for all UI components
- Document API endpoints as they're created
- Write tests alongside feature development

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [TailwindCSS](https://tailwindcss.com/docs)
