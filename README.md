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

## Week 1 Build Plan

### ✅ Repo and Environments
- [x] Next.js app structure
- [ ] Vercel deployment
- [ ] Supabase project setup
- [ ] Environment variables configuration
- [x] Telemetry disabled

### 🎨 UI Setup
- [ ] shadcn/ui components installation
- [x] Tailwind CSS configuration
- [ ] React Query setup
- [x] Zod validation setup
- [x] ESLint & Prettier configuration

### 🔐 Auth + Wallet Link
- [ ] Supabase email/password auth
- [ ] Nonce endpoint for SIWS
- [ ] Wallet linking functionality
- [ ] Profile screen (email, wallet, role display)

### 🎫 Organic ID Issue Flow
- [ ] Holder check endpoint for ORG SPL token
- [ ] Auto-assign incremental ID to holders
- [ ] Reserve ID #1 for admin user

### 📝 Proposals MVP
- [ ] Create proposal
- [ ] Comment on proposals
- [ ] List proposals
- [ ] Proposal detail view
- [ ] Admin approval to convert to task
- [ ] RLS and moderation basics

### 🗳️ Voting MVP
- [ ] Start vote (create holder snapshots)
- [ ] Cast vote (hidden voter identity)
- [ ] Tally view (public results)
- [ ] Show weight source and block height

### ✅ Tasks and Sprints
- [ ] Convert approved proposal to task
- [ ] Simple Kanban board
- [ ] Sprint attachment
- [ ] Comments on tasks

### 🎯 Polish
- [ ] In-app notifications
- [ ] Plausible analytics integration
- [ ] Theming to match Organic site

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

#### Authentication
- Email/password via Supabase Auth
- Solana wallet linking with Sign-In With Solana (SIWS)
- Role-based access control (admin, member, viewer)

#### Organic ID System
- Automatic ID assignment to ORG token holders
- Sequential numbering system
- Blockchain verification

#### Proposals & Voting
- Create and discuss proposals
- Token-weighted voting
- Snapshot-based vote tallying
- Privacy-preserving voter records

#### Task Management
- Convert approved proposals to tasks
- Kanban board interface
- Sprint planning
- Task comments and collaboration

## Database Schema

To be implemented in Supabase migrations:

- `users` - User accounts and profiles
- `proposals` - DAO proposals
- `comments` - Comments on proposals/tasks
- `votes` - Vote records
- `holder_snapshots` - Token holder snapshots for voting
- `tasks` - Task management
- `sprints` - Sprint planning
- `notifications` - In-app notifications

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request to `main`

## License

Private project - All rights reserved
