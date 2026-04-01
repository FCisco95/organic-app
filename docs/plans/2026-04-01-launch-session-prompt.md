# Launch Session Prompt

Copy-paste this into your next Claude Code session:

---

## PROMPT:

We just merged the design system (terracotta branding, darker bg, i18n, unified layouts) to main. The app is live on Vercel but we haven't launched yet. The database is clean — only my account (Cisco, admin), 1 example proposal, 1 example task, and 1 Genesis Sprint.

I need you to help me prepare and execute the launch TODAY. Here's what needs to happen:

### 1. DOMAIN
We don't have a custom domain yet. Help me think through options and configure it on Vercel once I buy one. What domain should we get? (.org, .io, .app, .dao?)

### 2. SEED CONTENT — Ideas (5-8 ideas for the community to vote on)
Create ideas that people can immediately engage with. Mix of:
- **Product ideas** — "Add dark mode", "Mobile app", "Telegram notifications"
- **Governance ideas** — "How should we handle inactive members?", "Should council seats rotate?"
- **Community ideas** — "Weekly community calls", "Contributor spotlight series", "Bounty board for external devs"
- **Integration ideas** — "Jupiter DEX integration for $ORG", "Snapshot voting bridge"

These should feel like REAL community suggestions, not corporate filler. Write them as a community member would.

### 3. SEED CONTENT — Proposals (3-5 governance proposals)
Create proposals that show governance in action:
- **"Sprint Cadence: Weekly vs Biweekly"** — Let the community decide sprint length
- **"Treasury Allocation: How should we split the genesis treasury?"** — 40% dev, 25% community, 20% ops, 15% reserve
- **"Contributor Reward Structure"** — Points per task type, XP multipliers, bonus rules
- **"Community Guidelines & Code of Conduct"** — What behavior do we expect?
- **"First Community Call: When and how?"** — Format, frequency, platform

Put these in discussion or public status so people can comment immediately.

### 4. SEED CONTENT — Tasks (5-8 real tasks in the Genesis Sprint)
Create actual tasks people can claim and do:
- "Write the Organic manifesto post" (content, 5pts)
- "Design $ORG token utility explainer graphic" (design, 8pts)
- "Create community guidelines draft" (content, 5pts)
- "Build a getting-started video walkthrough" (content, 10pts)
- "Set up the Organic Discord server" (community, 5pts)
- "Write a thread about how DAO governance works" (content, 5pts)
- "Design social media templates for announcements" (design, 8pts)
- "Translate the welcome post to Portuguese" (content, 3pts)

### 5. SEED CONTENT — Welcome Post
Create a pinned welcome/announcement post that:
- Explains what Organic is in 2 paragraphs
- Lists the 3 things a new member should do first
- Links to the example proposal and task
- Has an excited but professional tone
- Mentions the Genesis Sprint and 2x XP event

### 6. OG IMAGE
Create or help me spec the `/public/og-image.png` (1200x630) for X/Discord link previews. What should it show?

### 7. LAUNCH ANNOUNCEMENT PLAN
Help me plan:
- **X/Twitter thread** (5-7 tweets) announcing the launch
- **Should I record a video?** If yes, what should I cover, how long, what format?
- **Should I schedule a live community call?** If yes, when (this week?), what platform (X Spaces? Discord?), what agenda?
- **Where to post** — Crypto Twitter, Reddit (r/solana, r/dao), Discord servers, Telegram groups?

### 8. VERIFY PRODUCTION
- Check the Vercel production deployment is live and working
- Test login flow, proposals page, tasks page, profile
- Make sure all pages render correctly with terracotta branding
- Check all 3 languages work (en, pt-PT, zh-CN)

### CONTEXT FILES:
- Design system work: PR #37 (merged)
- Easter campaign (DO NOT touch today): `docs/plans/2026-04-02-easter-activation-todo.md`
- Narrative plan: `docs/plans/2026-03-30-genesis-hatch-narrative.md`
- Build plan: `BUILD_PLAN.md`
- My account: fcisco95@proton.me, Cisco, admin, organic_id=1
- Org ID: f143d26b-d0be-4ccd-98ee-6226792e1940
- Dev server: use Node 20 (`nvm use 20`) — Node 24 breaks dev mode

Start by seeding the content, then help me with the launch plan. Don't ask too many questions — use your judgment and show me what you've created. I'll adjust.
