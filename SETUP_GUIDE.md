# Organic App - Complete Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Supabase account (free tier works)
- GitHub account
- Vercel account (for deployment)

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, Supabase, Solana Web3.js, React Query, Zod, Zustand, and shadcn/ui components.

## Step 2: Set Up Supabase Project

### Create New Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name it "Organic App"
4. Choose a strong database password
5. Select a region closest to your users
6. Wait for project to be provisioned (~2 minutes)

### Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - `Project URL` → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/20250101000000_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (green play button)
6. You should see "Success. No rows returned"

### Verify Database Setup

1. Go to **Database** → **Tables** in Supabase dashboard
2. You should see these tables:
   - user_profiles
   - orgs
   - proposals
   - votes
   - tasks
   - sprints
   - comments
   - holder_snapshots

3. Go to **Authentication** → **Policies**
4. Verify that RLS is enabled on all tables

## Step 3: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and fill in your values:

```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Solana (default values work for mainnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_ORG_TOKEN_MINT=DuXugm3sExzq2DfoDsdnK45xZdsHcSbonk

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=app.organic-bonk.fun
NEXT_TELEMETRY_DISABLED=1

# Admin
ADMIN_EMAIL=organic_community@proton.me

# Analytics (Optional - add later)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=app.organic-bonk.fun
```

**Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 4: Seed Admin User (First Run Only)

After you run the app for the first time and create your first user account with the email `organic_community@proton.me`, you'll need to manually set them as admin:

1. Sign up through the app at `/[locale]/login` (for example, `/en/login`)
2. Go to Supabase dashboard → **Table Editor** → **user_profiles**
3. Find your user row
4. Edit the row:
   - Set `role` to `admin`
   - Set `organic_id` to `1`
5. Save changes

## Step 5: Install shadcn/ui Components

We'll need these UI components for the app:

```bash
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
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
```

Or install all at once:

```bash
npx shadcn-ui@latest add button card input label textarea dialog dropdown-menu avatar badge tabs select toast table form
```

## Step 6: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the welcome page.

## Step 7: Test Authentication

1. Go to `/[locale]/login` (for example, `/en/login`)
2. Click "Sign Up"
3. Enter email and password
4. Check your email for verification link
5. Click the link to verify
6. Log in with your credentials

## Step 8: Link Your Wallet (Optional)

1. Install Phantom, Backpack, or Solflare wallet extension
2. Go to `/[locale]/profile` after logging in (for example, `/en/profile`)
3. Click "Connect Wallet"
4. Approve the connection in your wallet
5. Sign the message to verify ownership
6. Your wallet address will be saved

## Step 9: Get Organic ID

1. Make sure you hold some $ORG tokens in your wallet
2. Go to `/[locale]/profile` (for example, `/en/profile`)
3. Click "Get Organic ID"
4. The system will check your wallet balance
5. If you hold tokens, you'll be assigned the next available Organic ID
6. Your role will be upgraded to "member"

## Step 10: Deploy to Vercel (Production)

### Connect GitHub Repository

1. Push your code to GitHub (already done)
2. Go to [https://vercel.com](https://vercel.com)
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js

### Configure Environment Variables

1. In Vercel project settings → **Environment Variables**
2. Add all variables from your `.env.local`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_SOLANA_RPC_URL
   - NEXT_PUBLIC_SOLANA_NETWORK
   - NEXT_PUBLIC_ORG_TOKEN_MINT
   - NEXT_PUBLIC_APP_URL (set to your Vercel domain)
   - NEXT_PUBLIC_APP_DOMAIN
   - ADMIN_EMAIL
   - NEXT_TELEMETRY_DISABLED

3. Click "Deploy"

### Configure Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add `app.organic-bonk.fun`
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Redeploy

## Step 11: Configure Supabase for Production

1. In Supabase dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel production URL to:
   - Site URL
   - Redirect URLs

3. In **Settings** → **API**
4. Add your production domain to allowed origins if needed

## Troubleshooting

### Database Connection Issues

**Problem:** Can't connect to Supabase
**Solution:**

- Verify API keys in `.env.local`
- Check Supabase project is active (not paused)
- Ensure your IP isn't blocked in Supabase settings

### RLS Policy Errors

**Problem:** "new row violates row-level security policy"
**Solution:**

- Ensure you're logged in
- Check your user role in `user_profiles` table
- Verify RLS policies were created correctly

### Wallet Connection Fails

**Problem:** Wallet won't connect
**Solution:**

- Make sure wallet extension is installed
- Try different wallet adapter
- Check browser console for errors
- Verify wallet is on correct network (mainnet-beta)

### Organic ID Not Assigned

**Problem:** "Get Organic ID" button doesn't work
**Solution:**

- Verify wallet is linked
- Check you actually hold $ORG tokens
- Verify token mint address is correct
- Check RPC endpoint is responding

### Build Errors

**Problem:** `npm run build` fails
**Solution:**

- Run `npm install` to ensure all deps are installed
- Check TypeScript errors with `npm run lint`
- Verify all environment variables are set
- Clear `.next` folder and rebuild

## Next Steps

Now that everything is set up, proceed with building features:

1. ✅ Auth and wallet connection
2. → Build proposals CRUD
3. → Implement voting system
4. → Create task management
5. → Add admin panel

Refer to `WEEK1_CHECKLIST.md` for detailed implementation tasks.

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Supabase (if using CLI)
npx supabase init        # Initialize Supabase locally
npx supabase start       # Start local Supabase
npx supabase db reset    # Reset local database
npx supabase db push     # Push migrations

# Git
git add .
git commit -m "message"
git push origin main
```

## Support

- GitHub Issues: [https://github.com/FCisco95/organic-app/issues](https://github.com/FCisco95/organic-app/issues)
- Supabase Docs: [https://supabase.com/docs](https://supabase.com/docs)
- Next.js Docs: [https://nextjs.org/docs](https://nextjs.org/docs)
- Solana Docs: [https://docs.solana.com](https://docs.solana.com)
