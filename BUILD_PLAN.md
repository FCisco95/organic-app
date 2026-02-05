# Organic DAO Platform - Build Plan

## ✅ Completed Features

### Phase 1: Foundation (Completed)

- [x] Authentication system with Supabase
- [x] Wallet integration (Phantom)
- [x] Wallet linking and signature verification
- [x] Organic ID assignment system
- [x] User profiles with role management
- [x] Navigation with role-based access

### Phase 2: Task Management (Completed)

- [x] Database schema for tasks and sprints
- [x] Kanban board with drag-and-drop
- [x] Task CRUD operations
- [x] Task properties (priority, points, labels, due dates)
- [x] Sprint/Epoch assignment
- [x] Assignee management
- [x] Permission-based task management
- [x] Status workflow (backlog → todo → in_progress → review → done)
- [x] Task detail pages with full information
- [x] Task comments system
- [x] User assignment modal for admin/council
- [x] Task deletion with confirmation (admin only)
- [x] Drag-and-drop task status changes
- [x] Task cards with quick navigation and actions

### Phase 3: Enhanced Profiles (Completed)

- [x] Profile picture upload to Supabase Storage
- [x] Avatar display with gradient fallback
- [x] Editable profile fields (name, bio, location, website, Twitter, Discord)
- [x] Social media links with icons
- [x] Profile edit mode with validation
- [x] Character limits and field validation
- [x] Member since display
- [x] Avatar in navigation bar

### Phase 4: Navigation & UI (Completed)

- [x] Proposals navigation entry and routing
- [x] Navigation with user avatars
- [x] Organic ID badge display
- [x] Role-based menu items
- [x] Mobile responsive navigation
- [x] App shell with collapsible sidebar + top bar
- [x] Organic branding throughout

### Phase 5: Infrastructure (Completed)

- [x] Middleware for session management
- [x] Improved authentication flow
- [x] Better error handling across API routes
- [x] Environment variable configuration
- [x] Enhanced SSR session handling with debugging
- [x] Cookie configuration for production environments
- [x] Auth callback error handling and redirects

### Phase 5.5: Internationalization (Completed)

- [x] next-intl integration with locale-based routing
- [x] Locale middleware for automatic detection
- [x] Translation files for en, pt-PT, zh-CN (~100 keys each)
- [x] Locale switcher with accessible dropdown UI
- [x] All pages migrated to `[locale]` route structure

## 🚧 In Progress / Next Steps

### Phase 6: Sprint/Epoch Management

- [x] Create sprints page with CRUD operations
- [x] Current sprint board/list views
- [x] Sprint details view with tasks
- [x] Sprint date range and progress stats
- [ ] Sprint capacity planning
- [ ] Sprint burndown charts
- [x] Active sprint indicator
- [x] Sprint history and archive

### Phase 7: Proposals System (In Progress)

- [x] Proposal creation form (multi-step wizard with per-step Zod validation)
- [x] Proposal listing with filters (status + category dropdowns)
- [x] Proposal detail view (structured sections, admin panel, comments)
- [x] Proposal status workflow (draft → submitted → approved/rejected/voting)
- [x] Discussion/comments on proposals
- [x] Edit functionality for draft proposals (author/admin, reuses wizard)
- [x] Delete functionality with confirmation (author/admin)
- [x] Proposal categories (feature, governance, treasury, community, development)
- [x] Structured sections: summary, motivation, solution, budget, timeline (separate DB columns)
- [x] Category + status badge components (CategoryBadge, StatusBadge)
- [x] ProposalCard list component with category colors
- [x] Feature domain: types, schemas, hooks, barrel export (`src/features/proposals/`)
- [x] API routes: CRUD, comments, status changes (`src/app/api/proposals/`)
- [x] Database migration: proposal_category enum, structured columns, DELETE RLS policies
- [x] i18n: ProposalWizard + ProposalDetail namespaces across en, pt-PT, zh-CN
- [x] Legacy backward compat: body column always populated from concatenated sections
- [x] Detail page UI revamp: removed gradient header, sections in single container with higher contrast
- [ ] Voting mechanism (off-chain)
- [ ] Voting model: token-weighted snapshot (1 ORG = 1 vote)
- [ ] Voting model: quorum 5–10% circulating supply
- [ ] Voting model: approval threshold >50% YES (configurable for treasury)
- [ ] Voting model: 5-day voting window (configurable)
- [ ] Voting model: optional abstain counts toward quorum
- [ ] Voting model: proposal threshold (fixed or % supply)
- [ ] Anti-abuse: one live proposal per proposer + 7-day cooldown
- [ ] Execution window (3–7 days) + off-chain result handoff
- [ ] Proposal templates

### Phase 8: Treasury Management

- [ ] Treasury balance display
- [ ] Transaction history
- [ ] Rolling treasury model (no fixed budgets per sprint)
- [ ] Budget allocation tracking
- [ ] Spending proposals
- [ ] Multi-sig wallet integration (Squads or similar)
- [ ] Token distribution management
- [ ] Spending analytics

### Phase 9: Member Management

- [ ] Member directory with search/filter
- [ ] Member profiles (public view)
- [ ] Role assignment UI (admin)
- [ ] Member statistics and contributions
- [ ] Member onboarding flow
- [ ] Organic ID minting interface
- [ ] Organic ID eligibility threshold config
- [x] Leaderboard page and API for member rankings

### Phase 10: Analytics & Reporting

- [ ] DAO activity dashboard
- [ ] Task completion metrics
- [ ] Member contribution tracking
- [ ] Treasury analytics
- [ ] Proposal success rates
- [ ] Export functionality

### Phase 11: Notifications & Communication

- [ ] Email notifications for important events
- [ ] In-app notification system
- [ ] Task assignment notifications
- [ ] Proposal voting reminders
- [ ] Discord bot integration
- [ ] Announcement system

### Phase 12: Advanced Features

- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Task templates
- [ ] Proposal delegation

### Phase 13: Wallet Support

- [x] Add Solflare wallet adapter
- [x] Add Coinbase wallet adapter
- [x] Add Ledger wallet adapter
- [x] Add Torus wallet adapter
- [x] Fix wallet switching flow (select + connect sequencing)
- [x] Add Backpack wallet adapter (Wallet Standard auto-detect)
- [x] Add OKX wallet adapter (Wallet Standard auto-detect)
- [x] Add Binance Web3 Wallet adapter (Wallet Standard auto-detect)
- [x] Add TokenPocket wallet adapter

### Phase 14: Reputation & Gamification

- [ ] XP and level progression system (11 tiers)
- [ ] Reputation tiers with unlocks (voting power, task access, roles)
- [ ] Level/badge display on profiles
- [ ] Achievement system (milestones, roles, activity)
- [ ] Streak tracking (daily/weekly activity)
- [ ] Level-up animations and achievement popups
- [ ] Visible progress bars for level advancement

### Phase 15: Rewards & Distribution

- [ ] Point-to-token conversion (threshold-based claiming)
- [ ] Epoch pool distribution (fixed pool per sprint)
- [ ] Manual distribution tooling (admin)
- [ ] Treasury-linked rewards reporting

### Phase 16: Dispute Resolution

- [ ] Arbitration queue for disputed tasks
- [ ] High-rep arbitrators and escalation path (Council → Admin)

### Phase 17: Integrations (Future)

- [ ] Discord bot (notifications, role sync)
- [ ] Twitter/X engagement verification
- [ ] GitHub contribution tracking
- [ ] On-chain data verification (holdings/activity)

### Phase 18: Platform Expansion (Future)

- [ ] White-label / multi-tenant support
- [ ] Custom branding and domain per tenant
- [ ] Open-core vs premium feature split

## 🔧 Technical Improvements

### Performance

- [ ] Implement caching strategy (Redis or similar)
- [ ] Optimize database queries with indexes
- [ ] Add pagination to all list views
- [ ] Lazy loading for images
- [ ] Code splitting optimization
- [ ] Bundle size analysis and reduction

### Security

- [ ] Rate limiting on API routes
- [ ] Input sanitization review
- [ ] SQL injection prevention audit
- [ ] CSRF protection
- [ ] Security headers configuration
- [ ] Regular dependency updates

### Reliability

- [x] Server-side balance caching (30s TTL) to prevent RPC 429 errors
- [x] Client-side balance caching (15s TTL) to reduce API spam
- [ ] Replace public Solana RPC with paid provider (Helius/QuickNode/Alchemy)
- [ ] Solana RPC fallback/retry handling with timeouts

### Data & Schema

- [ ] Task quality scores table
- [ ] Reputation/XP tracking tables
- [ ] Achievements table
- [ ] Activity streak tracking
- [ ] Point balances ledger

### Testing

- [ ] Unit tests for utility functions
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Component testing with React Testing Library
- [ ] Test coverage reporting
- [ ] CI/CD pipeline setup

### Developer Experience

- [ ] API documentation with Swagger/OpenAPI
- [ ] Component storybook
- [ ] Development environment setup guide
- [ ] Contribution guidelines
- [ ] Code style guide
- [ ] Git hooks for linting/testing

### Deployment & Operations

- [ ] Production deployment checklist
- [ ] Environment-specific configurations
- [ ] Monitoring and logging setup (Sentry, LogRocket, etc.)
- [ ] Database backup strategy
- [ ] Disaster recovery plan
- [ ] Performance monitoring (Vercel Analytics, etc.)

## 🚀 Deployment Week Checklist (7-Day Plan)

### Day 1 — Production Readiness Baseline

- [ ] Validate all required env vars for local/staging/prod
- [ ] Confirm Supabase RLS policies for public read endpoints (activity, stats)
- [ ] Add/gate rate limiting for sensitive API routes (auth, voting, submissions)
- [ ] Remove or gate debug logs in API routes

### Day 2 — Critical Flows QA + Fixes

- [ ] Auth → Profile → Wallet link → Organic ID flow
- [ ] Tasks flow: create → claim → submit → review → points
- [ ] Proposals flow: create → vote → finalize → create task from proposal
- [ ] Activity feed realtime + stats accuracy

### Day 3 — Performance & Stability

- [ ] Add/verify indexes for heavy read tables (tasks, proposals, activity_log)
- [ ] Ensure list endpoints support pagination (tasks/proposals/activity)
- [ ] Review API responses for N+1 queries; batch/join where needed

### Day 4 — Security & Data Integrity

- [ ] Confirm Zod validation on all API routes
- [ ] Verify role checks for admin/council endpoints
- [ ] Re-verify wallet signature verification + nonce handling

### Day 5 — UX Polish + Mobile

- [ ] Fix layout regressions after sidebar changes
- [ ] Confirm mobile nav works across all localized routes
- [ ] Tighten error/empty states (activity feed, stats, lists)

### Day 6 — Deployment Dry Run

- [ ] Run `npm run lint` and `npm run build`
- [ ] Deploy Vercel preview and smoke test
- [ ] Verify Supabase redirect URLs + Site URL
- [ ] Validate activity feed/stats in staging (Jupiter price, realtime)

### Day 7 — Final Launch Checklist

- [ ] Confirm prod env vars are set
- [ ] Confirm migrations applied
- [ ] Confirm admin role seeded and working
- [ ] Launch and monitor logs/errors

## 📋 Immediate Next Tasks (Priority Order)

1. **Run Database Migrations**
   - Execute profile enhancement migration in Supabase
   - Execute task management migration in Supabase
   - Verify all tables and columns created

2. **Test Avatar Upload**
   - Verify Supabase Storage bucket created
   - Test avatar upload functionality
   - Verify RLS policies working correctly

3. **Sprint/Epoch Management**
   - Sprint capacity planning
   - Sprint burndown charts

4. **Proposal System MVP**
   - Add voting UI and vote persistence
   - Implement vote tallying rules (token-weighted)
   - Define proposal threshold and cooldown rules
   - Implement voting snapshot capture at proposal start
   - Add quorum + approval threshold evaluation

5. **Member Directory**
   - Create member listing page
   - Add search and filter capabilities
   - Implement public profile views

## 🎯 Milestone Goals

### Milestone 1: Core Platform (✅ Completed)

- Authentication, profiles, and navigation working
- Task management fully functional
- Basic DAO operations supported

### Milestone 2: Sprint & Proposals (Target: 2 weeks)

- Sprint management operational
- Proposal system MVP launched
- Member voting enabled

### Milestone 3: Treasury & Analytics (Target: 1 month)

- Treasury tracking implemented
- Basic analytics dashboard
- Reporting functionality

### Milestone 4: Production Ready (Target: 6 weeks)

- All security audits complete
- Testing coverage > 80%
- Performance optimized
- Documentation complete

## 📝 Notes

- All features should maintain the organic branding and design system
- Prioritize mobile responsiveness for all new features
- Consider accessibility (WCAG 2.1 AA) for all UI components
- Keep bundle size under control - review each major addition
- Document API endpoints as they're created
- Write tests alongside feature development

## 🔗 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [React DnD](https://react-dnd.github.io/react-dnd/)
- [TailwindCSS](https://tailwindcss.com/docs)

---

Last Updated: 2026-01-24
Version: 1.4

## Recent Updates (2026-01-22)

### Security Fix: Nonce Validation

- Added `wallet_nonces` table for server-side nonce storage
- Updated `/api/auth/nonce` to store nonces with 5-minute TTL
- Updated `/api/auth/link-wallet` to validate and consume nonces
- Prevents replay attacks on wallet signature verification

### Performance Fix: Solana RPC Rate Limiting

- Added server-side balance cache (30s TTL) in `/api/organic-id/balance`
- Added client-side balance cache (15s TTL) in profile page
- Logs cache hits vs RPC calls for debugging
- Prevents 429 errors from excessive RPC calls

### Infrastructure TODO

- Replace public Solana RPC with paid provider (Helius/QuickNode/Alchemy)
- Set `NEXT_PUBLIC_SOLANA_RPC_URL` in `.env.local`

## Recent Updates (2026-01-18)

### Internationalization Complete

- Added next-intl with locale-based routing ([locale] structure)
- Created translation files for English, Portuguese, and Chinese
- Built accessible LanguageSelector dropdown with keyboard navigation
- Migrated all pages to locale-aware routing

### UI Improvements

- Added LanguageSelector component with flag emoji display
- Refactored LocaleSwitcher to use new dropdown component
- Centralized language metadata in languageConfig

## Recent Updates (2026-01-17)

### Plan Accuracy Updates

- Marked sprint CRUD, detail views, and progress stats as completed
- Marked proposal voting as pending
- Added leaderboard completion and Solana RPC fallback task
- Added proposal voting baseline rules and wallet adapter roadmap

## Recent Updates (2025-01-26)

### Task Management Enhancements

- Added comprehensive task detail pages with comments system
- Implemented user assignment modal for admin/council members
- Added task deletion with confirmation modal (admin only)
- Enhanced kanban board with drag-and-drop improvements
- Added quick navigation and action buttons on task cards

### Proposal System Improvements

- Added inline editing for draft proposals
- Implemented delete functionality with confirmation
- Restricted edit/delete to authors and admins for draft proposals only

### Infrastructure Updates

- Enhanced Supabase SSR session handling with comprehensive logging
- Fixed middleware cookie configuration for production
- Improved auth callback error handling and redirects
- Implemented client-side Supabase operations for LocalStorage session compatibility
