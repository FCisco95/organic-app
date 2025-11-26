# Organic App

DAO governance and task management platform for Organic DAO

## Overview

A full-stack application for managing DAO proposals, voting, task management, and member coordination with Solana wallet integration.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Solana
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query
- **Validation**: Zod
- **Analytics**: Plausible

## Project Structure

```
organic-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── nonce/         # SIWS nonce generation
│   │   │   ├── organic-id/    # Organic ID issuance
│   │   │   ├── proposals/     # Proposal CRUD
│   │   │   ├── voting/        # Voting endpoints
│   │   │   └── tasks/         # Task management
│   │   ├── profile/           # User profile page
│   │   ├── proposals/         # Proposals listing & detail
│   │   ├── voting/            # Voting interface
│   │   ├── tasks/             # Task management UI
│   │   ├── sprints/           # Sprint planning
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   │
│   ├── components/            # Reusable components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── auth/             # Auth components
│   │   ├── proposals/        # Proposal components
│   │   ├── voting/           # Voting components
│   │   ├── tasks/            # Task components
│   │   ├── sprints/          # Sprint components
│   │   └── notifications/    # Notification components
│   │
│   ├── features/             # Feature-based modules
│   │   ├── auth/             # Auth logic & hooks
│   │   ├── organic-id/       # Organic ID logic
│   │   ├── proposals/        # Proposal logic
│   │   ├── voting/           # Voting logic
│   │   ├── tasks/            # Task logic
│   │   ├── sprints/          # Sprint logic
│   │   ├── notifications/    # Notification logic
│   │   └── profile/          # Profile logic
│   │
│   ├── lib/                  # Utility functions
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript types
│   └── config/               # Configuration files
│
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions
│
├── public/                   # Static assets
└── [config files]            # Various configuration files

```

## ✅ Completed Features

### Authentication & User Management
- [x] Supabase email/password authentication
- [x] Solana wallet integration (Phantom, Solflare, etc.)
- [x] Wallet linking with signature verification
- [x] Role-based access control (admin, council, member, viewer)
- [x] User profiles with editable fields
- [x] Profile picture upload to Supabase Storage
- [x] Avatar display with gradient fallback
- [x] Social media links (Twitter, Discord)

### Organic ID System
- [x] Automatic ID assignment to ORG token holders
- [x] Sequential numbering system
- [x] Blockchain verification via Solana RPC
- [x] Balance checking and validation
- [x] Admin-reserved ID #1

### Task Management
- [x] Full CRUD operations for tasks
- [x] Interactive Kanban board with 5 columns
- [x] Drag-and-drop task status updates
- [x] Task detail pages with comprehensive information
- [x] Task comments system with real-time updates
- [x] User assignment modal (admin/council)
- [x] Task deletion with confirmation (admin only)
- [x] Task properties: priority, points, labels, due dates
- [x] Sprint/Epoch assignment
- [x] Permission-based task management
- [x] Status workflow: backlog → todo → in_progress → review → done

### Proposals & Voting
- [x] Proposal creation form with validation
- [x] Proposal listing with filters and search
- [x] Proposal detail view with full information
- [x] Token-weighted off-chain voting system
- [x] Vote casting and tallying
- [x] Proposal status workflow: draft → active → passed/rejected
- [x] Discussion/comments on proposals
- [x] Edit functionality for draft proposals (author/admin)
- [x] Delete functionality with confirmation (author/admin)
- [x] Admin controls for proposal lifecycle

### Sprint Management
- [x] Sprint creation and management
- [x] Sprint listing page
- [x] Sprint detail pages with task views
- [x] Active sprint tracking
- [x] Sprint progress visualization

### Infrastructure & UI
- [x] Next.js 14 App Router setup
- [x] Tailwind CSS with custom Organic branding
- [x] Responsive mobile-first design
- [x] Navigation with role-based menu items
- [x] Enhanced SSR session handling
- [x] Middleware for authentication
- [x] API routes with proper error handling
- [x] Solana RPC fallback system
- [x] Environment configuration
- [x] Cookie-based session management

## 🚧 In Progress / Planned Features

### Advanced Task Features
- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Task templates
- [ ] Sprint burndown charts
- [ ] Sprint capacity planning

### Proposal Enhancements
- [ ] Proposal templates
- [ ] Proposal categories/tags
- [ ] Delegation system

### Treasury & Analytics
- [ ] Treasury balance display
- [ ] Transaction history
- [ ] Budget allocation tracking
- [ ] Member contribution metrics
- [ ] DAO activity dashboard

### Communication
- [ ] In-app notification system
- [ ] Email notifications
- [ ] Discord bot integration
- [ ] Announcement system

For detailed build plan, see [BUILD_PLAN.md](./BUILD_PLAN.md)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Solana wallet

### Installation

1. Clone the repository
```bash
git clone https://github.com/FCisco95/organic-app.git
cd organic-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Key Features

#### 🔐 Authentication & Profiles
- Email/password authentication via Supabase
- Solana wallet integration and linking
- Role-based access control (admin, council, member, viewer)
- Customizable user profiles with avatars
- Social media integration

#### 🎫 Organic ID System
- Automatic ID assignment to ORG token holders
- Sequential numbering with blockchain verification
- Real-time balance checking via Solana RPC
- Admin controls for ID management

#### 📋 Task Management
- Interactive Kanban board with drag-and-drop
- Comprehensive task detail pages
- Real-time commenting system
- User assignment and delegation
- Sprint/epoch organization
- Priority, points, and label tracking

#### 📝 Proposals & Governance
- Full proposal lifecycle management
- Token-weighted voting system
- Discussion threads and comments
- Status workflow from draft to execution
- Edit and delete controls for authors/admins
- Transparent voting results

#### 🏃 Sprint Planning
- Sprint creation and management
- Task-sprint associations
- Progress tracking and visualization
- Active sprint monitoring

## Database Schema

Implemented in Supabase with Row Level Security:

- `user_profiles` - User accounts, profiles, and role management
- `proposals` - DAO proposals with lifecycle tracking
- `proposal_comments` - Discussion threads on proposals
- `votes` - Vote records and tallying
- `tasks` - Task management with priorities and status
- `task_comments` - Collaboration on tasks
- `sprints` - Sprint/epoch planning and tracking
- `leaderboard` - Member contribution rankings

See `supabase/migrations/` for full schema definitions.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request to `main`

## License

Private project - All rights reserved
