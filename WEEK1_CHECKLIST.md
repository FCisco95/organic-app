# Week 1 Implementation Checklist

## Day 1-2: Setup & Foundation

### Repo and Environments
- [x] Create GitHub repository
- [x] Initialize Next.js project structure
- [x] Set up folder organization
- [ ] Create Vercel project
- [ ] Create Supabase project
- [ ] Configure environment variables
- [x] Disable telemetry

### Dependencies Installation
```bash
npm install
```

### UI Framework Setup
```bash
# Install shadcn/ui components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add tabs
```

- [x] Tailwind CSS configured
- [ ] shadcn/ui components installed
- [ ] React Query provider setup
- [x] Zod validation ready
- [x] ESLint & Prettier configured

## Day 3: Authentication

### Supabase Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy API keys to `.env.local`
- [ ] Create `users` table with columns:
  - `id` (uuid, primary key)
  - `email` (text, unique)
  - `wallet_pubkey` (text, nullable)
  - `organic_id` (integer, nullable, unique)
  - `role` (text, default: 'member')
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

### Auth Implementation
- [ ] Create `/src/lib/supabase.ts` with Supabase client
- [ ] Build login page at `/src/app/auth/login/page.tsx`
- [ ] Build signup page at `/src/app/auth/signup/page.tsx`
- [ ] Implement auth context in `/src/features/auth/context.tsx`
- [ ] Add auth middleware for protected routes

### Wallet Integration
- [ ] Create `/src/app/api/nonce/route.ts` for SIWS
- [ ] Build wallet connect button component
- [ ] Implement wallet linking in profile
- [ ] Test wallet connection flow

### Profile Page
- [ ] Create `/src/app/profile/page.tsx`
- [ ] Display user email
- [ ] Display connected wallet address
- [ ] Display user role
- [ ] Display Organic ID (when assigned)

## Day 4: Organic ID System

### Database Setup
- [ ] Verify ORG SPL token mint address
- [ ] Configure Solana RPC endpoint
- [ ] Create holder verification function

### Organic ID Implementation
- [ ] Create `/src/app/api/organic-id/check/route.ts`
- [ ] Implement SPL token holder check
- [ ] Build ID assignment logic (sequential)
- [ ] Seed admin user with ID #1
- [ ] Add ID display to profile page
- [ ] Test with test wallet

## Day 5: Proposals MVP

### Database Schema
Create tables in Supabase:

**`proposals`**
- `id` (uuid, primary key)
- `title` (text)
- `description` (text)
- `author_id` (uuid, foreign key to users)
- `status` (text: draft, submitted, approved, rejected)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**`comments`**
- `id` (uuid, primary key)
- `content` (text)
- `author_id` (uuid, foreign key to users)
- `proposal_id` (uuid, nullable, foreign key to proposals)
- `task_id` (uuid, nullable)
- `created_at` (timestamp)

### RLS Policies
- [ ] Enable RLS on proposals table
- [ ] Enable RLS on comments table
- [ ] Allow users to create proposals
- [ ] Allow users to read all proposals
- [ ] Allow only admins to update status
- [ ] Allow users to comment

### Proposals Implementation
- [ ] Create `/src/app/api/proposals/route.ts` (POST, GET)
- [ ] Create `/src/app/proposals/new/page.tsx` (create form)
- [ ] Create `/src/app/proposals/page.tsx` (list view)
- [ ] Create `/src/app/proposals/[id]/page.tsx` (detail view)
- [ ] Add comment section to detail page
- [ ] Build admin approval UI (admins only)

## Day 6: Voting MVP

### Database Schema

**`votes`**
- `id` (uuid, primary key)
- `proposal_id` (uuid, foreign key to proposals)
- `title` (text)
- `description` (text)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `snapshot_block` (bigint)
- `status` (text: active, ended)
- `created_at` (timestamp)

**`holder_snapshots`**
- `id` (uuid, primary key)
- `vote_id` (uuid, foreign key to votes)
- `wallet_pubkey` (text)
- `token_balance` (bigint)
- `vote_weight` (numeric)
- `created_at` (timestamp)

**`ballots`**
- `id` (uuid, primary key)
- `vote_id` (uuid, foreign key to votes)
- `voter_id` (uuid, foreign key to users)
- `choice` (text: yes, no, abstain)
- `created_at` (timestamp)
- Unique constraint on (vote_id, voter_id)

### RLS Policies
- [ ] Enable RLS on all voting tables
- [ ] Allow admins to create votes
- [ ] Allow token holders to cast votes
- [ ] Hide voter identity from non-admins
- [ ] Allow public tally viewing

### Voting Implementation
- [ ] Create `/src/app/api/voting/start/route.ts`
- [ ] Implement snapshot creation logic
- [ ] Create `/src/app/api/voting/cast/route.ts`
- [ ] Create `/src/app/voting/page.tsx` (active votes list)
- [ ] Create `/src/app/voting/[id]/page.tsx` (vote detail + cast ballot)
- [ ] Build tally calculation
- [ ] Display results with weight source and block height

## Day 7: Tasks & Sprints

### Database Schema

**`tasks`**
- `id` (uuid, primary key)
- `title` (text)
- `description` (text)
- `proposal_id` (uuid, nullable, foreign key)
- `status` (text: backlog, todo, in_progress, review, done)
- `assignee_id` (uuid, nullable, foreign key to users)
- `sprint_id` (uuid, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**`sprints`**
- `id` (uuid, primary key)
- `name` (text)
- `start_date` (date)
- `end_date` (date)
- `status` (text: planning, active, completed)
- `created_at` (timestamp)

### Tasks Implementation
- [ ] Create `/src/app/api/tasks/route.ts`
- [ ] Build task conversion from proposals (admin only)
- [ ] Create `/src/app/tasks/page.tsx` (Kanban board)
- [ ] Implement drag-and-drop status updates
- [ ] Add task comments
- [ ] Create sprint management UI
- [ ] Implement task assignment

## Bonus: Polish

### Notifications
- [ ] Create notifications table in Supabase
- [ ] Build notification context
- [ ] Add notification bell component
- [ ] Trigger notifications on key events:
  - New proposal created
  - Proposal approved/rejected
  - Vote started
  - Task assigned

### Analytics
- [ ] Sign up for Plausible account
- [ ] Add Plausible script to layout
- [ ] Configure domain in env variables
- [ ] Test pageview tracking

### Theming
- [ ] Review Organic website colors
- [ ] Update Tailwind config with brand colors
- [ ] Customize shadcn/ui theme variables
- [ ] Add logo and branding assets
- [ ] Ensure mobile responsiveness

## Testing & Deployment

### Testing
- [ ] Test all authentication flows
- [ ] Test proposal creation and approval
- [ ] Test voting with multiple accounts
- [ ] Test task conversion
- [ ] Mobile device testing

### Deployment
- [ ] Deploy to Vercel
- [ ] Verify environment variables
- [ ] Test production build
- [ ] Share with stakeholders

## Notes

- Keep commits small and focused
- Write clear commit messages
- Test each feature before moving to the next
- Document any deviations from plan
- Ask for clarification when needed

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [React Query Docs](https://tanstack.com/query/latest)
