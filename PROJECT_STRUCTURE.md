# Organic App - Detailed Project Structure

## Directory Organization

### `/src/app` - Next.js App Router
The main application routes and pages.

**API Routes (`/src/app/api`):**
- `/auth` - Supabase authentication endpoints
- `/nonce` - Generate nonce for Sign-In With Solana (SIWS)
- `/organic-id` - Check holder status and issue Organic IDs
- `/proposals` - CRUD operations for proposals
- `/voting` - Vote creation, casting, and tallying
- `/tasks` - Task management operations

**Page Routes:**
- `/profile` - User profile (email, wallet, role, Organic ID)
- `/proposals` - Proposal list and detail views
- `/voting` - Active votes and results
- `/tasks` - Kanban board for task management
- `/sprints` - Sprint planning interface

### `/src/components` - Reusable UI Components
Organized by feature for easy maintenance.

- `/ui` - shadcn/ui base components (Button, Card, Dialog, etc.)
- `/auth` - Login, signup, wallet connect components
- `/proposals` - Proposal cards, forms, comment sections
- `/voting` - Vote cards, ballot interface, results display
- `/tasks` - Task cards, status badges, assignment UI
- `/sprints` - Sprint cards, timeline views
- `/notifications` - Toast notifications, notification bell

### `/src/features` - Feature Modules
Business logic separated from UI components.

Each feature directory contains:
- `hooks/` - Custom React hooks for the feature
- `api.ts` - API client functions
- `types.ts` - TypeScript interfaces
- `utils.ts` - Feature-specific utilities
- `validation.ts` - Zod schemas

**Features:**
- `auth/` - Authentication logic, session management
- `organic-id/` - Token holder verification, ID assignment
- `proposals/` - Proposal creation, approval workflow
- `voting/` - Snapshot creation, vote casting, tallying
- `tasks/` - Task conversion, status updates
- `sprints/` - Sprint creation, task assignment
- `notifications/` - In-app notification system
- `profile/` - User profile management

### `/src/lib` - Shared Utilities
- `utils.ts` - Common utility functions (cn, formatters)
- `supabase.ts` - Supabase client configuration
- `solana.ts` - Solana connection and SPL token utilities
- `constants.ts` - App-wide constants

### `/src/hooks` - Global Custom Hooks
- `useAuth.ts` - Authentication state
- `useWallet.ts` - Solana wallet integration
- `useUser.ts` - Current user data
- `useNotifications.ts` - Notification system

### `/src/types` - TypeScript Definitions
Shared type definitions used across the application.

### `/src/config` - Configuration
- `site.ts` - Site metadata and navigation
- `features.ts` - Feature flags
- `rpc.ts` - RPC endpoints configuration

### `/supabase` - Database & Backend
- `/migrations` - SQL migration files
- `/functions` - Supabase Edge Functions

### `/public` - Static Assets
- `/assets` - Images, icons, fonts

## Feature Implementation Order (Week 1)

### Phase 1: Foundation
1. Install dependencies (`npm install`)
2. Configure Supabase project
3. Set up environment variables
4. Install shadcn/ui components
5. Configure React Query provider

### Phase 2: Authentication
1. Implement Supabase auth
2. Create login/signup pages
3. Build nonce endpoint for SIWS
4. Implement wallet linking
5. Create profile page

### Phase 3: Organic ID
1. Create holder check endpoint
2. Implement ID assignment logic
3. Add ID display to profile
4. Seed admin user with ID #1

### Phase 4: Proposals
1. Database schema for proposals
2. Create proposal form
3. Proposal list view
4. Proposal detail with comments
5. Admin approval interface
6. RLS policies

### Phase 5: Voting
1. Voting schema and snapshots
2. Start vote functionality
3. Cast vote interface
4. Tally calculation
5. Results display

### Phase 6: Tasks & Sprints
1. Task conversion from proposals
2. Kanban board UI
3. Sprint creation
4. Task assignment
5. Comments on tasks

### Phase 7: Polish
1. Notification system
2. Plausible analytics
3. Theme customization
4. Mobile responsiveness

## Development Guidelines

### Component Naming
- Use PascalCase for components: `ProposalCard.tsx`
- Use camelCase for utilities: `formatDate.ts`
- Use kebab-case for directories: `organic-id/`

### File Organization
- Keep components small and focused
- Colocate related files
- Use index files for clean imports

### State Management
- Use React Query for server state
- Use React Context for global UI state
- Keep component state local when possible

### API Design
- Use REST conventions
- Return consistent error formats
- Include proper status codes

### Database
- Use Row Level Security (RLS)
- Write migrations for all schema changes
- Index frequently queried columns

## Testing Strategy
(To be implemented)

- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical flows
- Component tests for UI

## Deployment

### Vercel (Frontend)
- Automatic deployments from `main`
- Preview deployments for PRs
- Environment variables configured

### Supabase (Backend)
- Production and staging projects
- Migration pipeline
- Automated backups
