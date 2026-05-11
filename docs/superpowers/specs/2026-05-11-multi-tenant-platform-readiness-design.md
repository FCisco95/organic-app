# Multi-Tenant Platform Readiness — Design Spec

**Date:** 2026-05-11
**Status:** Approved design (brainstorm output; ready for execution planning)
**Author:** Cisco (via Organic Steward panel — Claude brainstorm session)
**Scope:** Strategic architecture for Organic v2 — the multi-tenant platform readiness phase. Does NOT include implementation tickets, file paths, or migrations. Each subsystem below has its own follow-up brainstorm + execution plan.

---

## Context

Organic Hub is live at organichub.fun (~50 users on $ORG). The platform's seven canonical pillars (transparency, share of rewards, incentivization, community management, roadmap definition, sprint-basis execution, automatic payments — all AI-driven) exist as v1 features for ONE community. They are tested, hardened, and operational.

The strategic question driving this design:

> **What does Organic need to become before it can credibly host other blockchain communities — as a multi-tenant platform that a launchpad would route to, and that a paying community would adopt?**

Today's blocker (surfaced explicitly during this session): the platform's day-to-day operations are heavily dependent on the founder (Cisco) manually moving tasks through their lifecycle. No other community founder will adopt a system that requires that level of operational labor. **Multi-tenancy is, at heart, a self-driving-DAO problem, not a data-model problem.**

This spec defines the strategic frame. Each subsystem identified here gets its own dedicated design session.

---

## The Big Picture: Four-Layer Architecture

Organic v2 is composed of four layers:

```
┌────────────────────────────────────────────────────────────────────┐
│  IDENTITY LAYER (cross-cutting)                                     │
│  Organic Passport — soulbound NFT, Bronze→Diamond, stackable        │
│  signals (stake, Twitter, on-chain, zk-passport, contribution)      │
│  Required to register on the platform; B2B-licensable to other apps │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│  INDEX LAYER (organichub.fun parent)                                │
│  Organic Scan — open community-health scoring + alpha discovery     │
│  Passport directory + B2B partner registry                          │
│  Public faces of all tenants (Organic Score, top contributors, etc) │
└────────────────────────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ TENANT: coinA        │ TENANT: coinB        │ TENANT: coinC...     │
│ coinA.organichub.fun │ dao.coinb.com [V]    │ coinC.organichub.fun │
│ ─ Constitution       │ ─ Constitution       │ ─ Constitution       │
│ ─ Squads treasury    │ ─ Squads treasury    │ ─ Squads treasury    │
│ ─ Rotating council   │ ─ Rotating council   │ ─ Rotating council   │
│ ─ Sprints, proposals │ ─ Sprints, proposals │ ─ Sprints, proposals │
│ ─ Members + roster   │ ─ Members + roster   │ ─ Members + roster   │
│ ─ Steward (Organic)  │ ─ Steward (custom*)  │ ─ Steward (Organic)  │
└──────────────────────┴──────────────────────┴──────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│  ECONOMIC LAYER (cross-cutting)                                     │
│  Freemium │ Verified subscription ($ORG/month) │ Reward-pool fee    │
│  (1-3% on actual payouts above threshold)                           │
└────────────────────────────────────────────────────────────────────┘
                       * Verified tier, phase 2
```

### Layer responsibilities

- **Identity Layer** — global, cross-tenant. One Passport per human; required before joining any community. Tiered credential (Bronze through Diamond). Composable: any Solana app can read it.
- **Index Layer** — the public surface of the entire ecosystem. Drives discovery, alpha-hunting, and tenant acquisition.
- **Tenant Layer** — where each community lives. Per-tenant routing, branding, treasury, governance, members, Steward.
- **Economic Layer** — how Organic makes money. Freemium baseline; Verified subscription for premium; reward-pool fee captures upside when tenants succeed.

---

## Decisions Locked (13)

| # | Decision | Resolution |
|---|---|---|
| 1 | Relationship to Discord/Telegram | Layer on top. Organic owns *structured work*; chat stays in Discord/Telegram. Bots and integrations bridge them. |
| 2 | Platform-level personhood | Organic Passport — soulbound NFT, tiered, stackable signals. |
| 3 | Passport tier structure | Bronze (stake $ORG) → Silver (+Twitter +on-chain) → Gold (+zk-passport). Plus Platinum + Diamond, earned only via on-platform legible contribution (anti-bot moat). |
| 4 | Per-community gating | Two knobs: minimum Passport tier + minimum token holding. Action-gated by default (open browse, gated act). |
| 5 | AI scope | Suggest + Act, never Decide. AI drafts, nudges, executes mechanical state transitions. Humans + on-chain rules make every value/judgment call. |
| 6 | Cross-community visibility | Layered: public face (Organic Score, finished proposals, top contributors) + private inner space (drafts, internal discussion, member rosters). |
| 7 | Organic Scan scope | Open scoring of every crypto community (using publicly observable signals) + Verified upgrade tier for richer profiles. |
| 8 | Revenue model | Freemium + reward-pool fee. Hub free to use. Verified subscription ($ORG/month) unlocks custom domain, unlimited Steward, richer Scan profile, premium AI. 1-3% fee on actual payouts above threshold. NO token allocation. |
| 9 | Onboarding flow | AI-conversational setup (~10-15 min) + auto-spawned Bootstrap Constitution (template + initial sprint + starter tasks + foundational proposals open for community ratification). Founder + admin panel for manual tuning. |
| 10 | URL/branding model | Subdomain default (`coinname.organichub.fun` — auto-provisioned via wildcard DNS + Vercel multi-tenant middleware) + custom domain on Verified tier. |
| 11 | Treasury model | Auto-create Squads multi-sig at signup (founder pays ~$5-20 SOL rent, sole initial signer). Bootstrap Constitution includes "Founding Council Election" proposal. Members vote in 4 council signers → multi-sig rotates to 3-of-5. Rotational Council Governance: signers re-elected on cadence. Founder rage-quit recovery = reputational pressure via Scan (lose Verified, "Non-Governed Treasury" warning). |
| 12 | Constitution-as-Configuration | Communities vote on their own governance parameters: rotation cadence (default monthly; configurable bi-weekly to quarterly; weekly deferred), council size (3/5/7/9; default 5), scoring formula weights, election eligibility. Templates per archetype (Memecoin / DAO Governance / Builder Collective / Creator Coin). Re-votable any time. |
| 13 | AI Steward persona | Single "Organic Steward" identity at MVP for brand reinforcement. Per-community overlay (name, avatar, tone) unlocked on Verified phase 2. |

---

## Pillar Coverage (v1 → v2)

Each of the 7 canonical pillars assessed for multi-tenant readiness. **Pillar 4 is the central engineering bet.**

| Pillar | v1 today ($ORG-only) | v2 multi-tenant ready | Gap |
|---|---|---|---|
| 1. Transparency | wallets.json for $ORG + Bubblemaps labeling | Per-tenant public face + Organic Scan aggregation + Squads on-chain treasuries | Scan pipeline, tenant-scoped wallets.json, public-face data layer |
| 2. Share of rewards | Reward pool epoch distribution for $ORG | Per-tenant reward pool + Rotational Council governance + on-chain fee accounting | Per-tenant pool infra, fee mechanism, governed payout choreography |
| 3. Incentivization | Sprints + leaderboard + XP for $ORG | Per-tenant sprints + leaderboard + cross-tenant Organic Score aggregated via Scan | Tenant scoping of all gamification tables |
| 4. Community management | **Manual orchestration by founder** | **AI Steward auto-creates tasks, nudges members, moves items, recaps, drafts** | **Steward build — biggest engineering item** |
| 5. Roadmap definition | Proposals + voting for $ORG | Multi-tenant proposals + Constitution-as-Configuration + AI-drafted improvements | Proposal table tenant-scoping, constitution template engine |
| 6. Sprint execution | Sprint phase engine for $ORG | Per-tenant sprint engine + auto-recap + auto-task drafting | Tenant scoping, recap automation |
| 7. Automatic payments | Manual payouts (no multi-sig) | Squads multi-sig + Rotational Council + Steward-composed transactions + reward-pool fee | Squads integration, signer choreography, fee accounting |

**Honest stub-vs-real read:**
- Pillars 3, 5, 6 are real. Gap = tenant scoping.
- Pillars 1, 7 are partially real. Gap = infrastructure work.
- Pillar 2 needs new revenue infrastructure (fee accounting) on top of existing reward pool.
- **Pillar 4 is a stub today.** AI Steward is the single largest engineering item in v2 and the unlock for the whole multi-tenant story.

---

## Decentralization Posture

**On-chain (trustless):**
- Treasury custody (Squads multi-sig per tenant)
- Signer rotations (multi-sig transactions, signed by current council)
- Reward distribution events (token transfers)
- Passport NFT issuance (soulbound on Solana)
- Verified badge attestations (optional, phase 2)

**Off-chain (platform-mediated, transparent, audit-logged):**
- Task and proposal state machines
- AI Suggest + Act steps (every action logged with prompt + output)
- Scoring computation (formula is community-configured; output recomputable from raw signals)
- Internal discussion, drafts, member rosters
- Constitution-as-Configuration storage (per-community config)

**The principle:** Anything that moves money or rotates power lives on-chain. Coordination and signaling lives off-chain but is auditable. AI never moves money or judges people; it proposes and executes pre-decided choreography only.

---

## What This Unlocks for Launchpad Partnerships

A launchpad would route tokens to Organic because:

1. **10-minute auto-provisioning** — new token launch → fully-operational community space (treasury, governance, initial sprint, starter tasks) within minutes
2. **Verified Scan profile** — every coin gets a public health surface, comparable across the ecosystem; their tokens "show up well" on the discovery layer
3. **Rotational Council Governance** — communities can point to *real* trustless, community-elected treasuries (not founder-controlled wallets) — a genuinely novel positioning angle
4. **Steward operations** — communities don't go zombie after launch; AI keeps the loop alive even when human founders disengage
5. **Passport personhood** — bot-farm-resistant community quality, defensible against the "rug coin" critique that launchpads currently absorb

That's the pitch. Whether *any specific launchpad* (Bonk, others) says yes is a separate go-to-market question — but the platform now has a story worth pitching, which is the prerequisite this design validates.

---

## Implementation Sub-Sessions (the work this spec spawns)

Each of these is a dedicated brainstorm + execution plan. Listed in **recommended order of execution**, with the first opening questions to ask when each session is opened.

### Phase A: Foundations (multi-tenant DB + routing)

**Sub-session 1: Multi-tenant data model migration**
- *Goal:* Add `tenant_id` to all relevant tables; design RLS strategy; backfill $ORG community as tenant 0.
- *First questions:* Which tables stay global (passports, scan_profiles, users) vs tenant-scoped (everything else)? Composite PK or single-column tenant scope? How do we backfill existing $ORG data without breaking live users?
- *Rough recommendation:* `tenant_id UUID` foreign key on all per-community tables. RLS policy `tenant_id = current_setting('app.current_tenant_id')`. Single backfill migration assigns $ORG to a fixed UUID. Composite indexes `(tenant_id, ...)` on hot tables.

**Sub-session 2: Subdomain + Vercel-for-Platforms infrastructure**
- *Goal:* Route `*.organichub.fun` to the right tenant; support custom domains on Verified.
- *First questions:* Use Vercel's Domain API for custom domain provisioning, or roll our own with Cloudflare? How do we handle www/apex differences? Do we need an Edge cache layer per tenant?
- *Rough recommendation:* Vercel for Platforms reference architecture. Wildcard DNS + wildcard SSL on `*.organichub.fun`. Vercel Edge Middleware extracts subdomain → looks up tenant_id → injects into request context. Custom domain support via Vercel's `/v9/projects/{id}/domains` API on Verified tier.

### Phase B: Trust Substrate (Passport + Treasury)

**Sub-session 3: Organic Passport spec**
- *Goal:* Credential schema; signal weights per tier; soulbound NFT mechanics; Self.xyz integration; B2B SDK shape.
- *First questions:* Which Solana NFT standard (Token-2022 with NonTransferable extension, or Metaplex)? Where does the score live — on-chain metadata vs off-chain attestation? How do other apps read the credential (RPC call vs SDK)?
- *Rough recommendation:* Token-2022 NonTransferable extension (cleanest soulbound primitive on Solana). Tier on-chain (immutable); detailed signals in off-chain attestation service (cheaper updates). SDK is a thin wrapper around the on-chain read + attestation fetch.

**Sub-session 4: Treasury choreography deep-dive**
- *Goal:* Exact Squads SDK call sequence; signer rotation transaction structure; founder rage-quit recovery flow; reward-pool fee accounting.
- *First questions:* Squads V4 SDK ergonomics? Founder pays in SOL — is that friction acceptable, or should platform sponsor first creation? How does fee accounting work — pre-deduct or post-collect?
- *Rough recommendation:* Squads V4 SDK with founder-pays creation. Reward-pool fee = post-collect (community pays out 100%, then a follow-up tx claims the fee from a designated fee vault). Reputational rage-quit recovery via Scan badge revocation; no custom on-chain program in MVP.

### Phase C: The Steward (AI operational layer)

**Sub-session 5: AI Steward operational spec**
- *Goal:* Prompts, tools, model selection, batching strategy, cost controls, audit log, hallucination guards.
- *First questions:* What's the Steward's tool set (draft task, propose proposal, recap sprint, compose multi-sig tx)? Real-time vs batched (free vs Verified)? Which models (Anthropic via AI Gateway with fallbacks)?
- *Rough recommendation:* Vercel AI Gateway with provider failover. Single Steward agent with ~6 tools (task draft, proposal draft, sprint recap, signer-rotation tx compose, sentiment summary, trend detection). Cheap model (Haiku-class) for routine batched work; large model (Sonnet/Opus) only when context-heavy. All actions audit-logged with prompt + tool call + output.

**Sub-session 6: Bootstrap Constitution template catalog**
- *Goal:* Define templates (Memecoin / DAO Governance / Builder Collective / Creator Coin); what each spawns at signup; how communities select + ratify.
- *First questions:* What are the canonical archetypes? What's the minimum viable starter sprint per archetype? How are templates versioned + improved over time?
- *Rough recommendation:* Start with two templates (Memecoin, DAO Governance) at MVP; add Builder + Creator in phase 2. Each template defines: default sprint cadence, default gates, council size, scoring formula, 5-10 starter tasks, 3-5 foundational proposals open for ratification.

### Phase D: Discovery (Organic Scan)

**Sub-session 7: Organic Scan spec**
- *Goal:* Data pipeline; scoring formula MVP; public-face data model; alpha-discovery UI; verified-upgrade differentiator.
- *First questions:* What goes into the Organic Score (component weights)? How often does Scan refresh (real-time vs hourly vs daily)? Which external data sources (DexScreener, Twitter, on-chain) do we integrate first?
- *Rough recommendation:* Daily-refreshed Score (hourly for Verified). MVP score components: task completion velocity, proposal pass rate, member growth, Treasury health, aggregated Twitter reach of members, holder distribution. Scrape DexScreener + Twitter Advanced Search + on-chain RPC for non-tenant communities. Verified tenants contribute private signal access for higher accuracy.

### Phase E: Revenue & Tier Operations

**Sub-session 8: Verified tier + reward-pool fee operations**
- *Goal:* Subscription billing in $ORG; fee accounting on-chain; tier feature gating.
- *First questions:* On-chain subscription program (similar to Squads but for recurring tier payments)? How do we handle subscription lapses (graceful degradation vs hard cut)? Tax/reporting implications of reward-pool fee revenue?
- *Rough recommendation:* Stripe-like SaaS billing in $ORG via simple "pay-and-extend" model (no recurring debits; pay once for 30 days; auto-downgrade on lapse). Reward-pool fee accumulated in a designated Squads multi-sig (platform treasury); accounting reports generated quarterly.

### Phase F: Launchpad Partnership (gated by all of the above)

**Sub-session 9: Launchpad partnership pitch**
- *Goal:* Reach out to launchpads (Bonk first) once Phase A-E success criteria are met.
- *Prerequisite:* Pillar 4 (Steward) operational; at least 3 tenants beyond $ORG; Scan delivering real alpha-discovery use cases.
- *Reference:* `project_bonk_partnership.md` memory note.

### Parallel Track: Brand & Communication (starts now, runs alongside Phase A–F)

This track is **independent** of the engineering phases. It should kick off immediately because $ORG holders need a coherent presentation of the v2 vision, and the platform needs a brand identity it can carry into Verified launches and launchpad pitches. Content draws directly from this spec.

**Sub-session 10: Organic brand identity refresh**
- *Goal:* Establish a unified visual + verbal identity that carries across the three product surfaces (Hub, Scan, Passport) and is suitable for holder/partner-facing material.
- *First questions:*
  - Is "Organic" the parent brand with Hub/Scan/Passport as sub-brands, or are they four sibling brands under an umbrella? (Pre-requisite to logo work.)
  - Visual direction: do we lean editorial/serious (signals trust to launchpads), neo-brutalist (signals crypto-native energy), or warm-organic (literal to the name)?
  - Typography pairing, color system, motion language?
  - Logo: single mark + three product lockups, or three distinct marks tied by a system?
  - Voice: how does the Organic Steward "speak" in copy, versus how the platform speaks in marketing material?
- *Deliverables:*
  - Brand guidelines document (logo, color, type, voice, motion)
  - Three product lockups (Hub, Scan, Passport)
  - Component library starter (works with existing shadcn/Tailwind base)
- *Tooling suggestions:* AI-assisted design exploration via Claude artifacts, Figma AI, v0.dev, or similar. Iterate in those tools first; export final assets for the repo.
- *Recommended approach:* Open a dedicated `superpowers:brainstorming` session for brand direction with sample references before committing to a system.

**Sub-session 11: Holder & partner presentation deck**
- *Goal:* A polished deck (web-based or PDF) explaining Organic's v2 vision to existing $ORG holders, prospective launchpad partners, and prospective tenant communities. Content sourced directly from this spec.
- *Suggested structure (~12–15 slides):*
  1. Opening — "Organic is AI-driven infrastructure for blockchain communities"
  2. The problem — Discord/Telegram don't measure, Kaito-class platforms reward noise, no platform scores legible community work
  3. The seven pillars (with current $ORG live proof points)
  4. The four-layer architecture (Identity / Index / Tenant / Economic) — the diagram from this spec
  5. Organic Hub — what a community gets
  6. Organic Passport — the personhood layer (and B2B story)
  7. Organic Scan — the discovery layer with alpha-hunting use case
  8. Rotational Council Governance — the trustless treasury angle
  9. The AI Steward — self-driving DAO operations
  10. The economic model — freemium + reward-pool fee, power-law sustainability
  11. The launchpad partnership thesis
  12. Roadmap — Phase A → Phase F with target windows
  13. Success criteria — the 7 measurable goals from this spec
  14. What we need from you (call-to-action — varies by audience)
  15. Q&A / contact
- *Prerequisite:* Sub-session 10 (brand) ideally completed first so visuals are on-brand, but a draft version can ship with placeholder design.
- *Audience variants:* holder version (emphasizes value accrual to $ORG); launchpad version (emphasizes integration + retention story); tenant version (emphasizes ease of onboarding + Steward operations).
- *Tooling suggestions:* Claude artifacts for an interactive web deck; Pitch.com / Tome / Figma Slides for traditional decks. AI-assisted speaker notes drafted from this spec.

---

## Adjacent Strategic Questions (open for future sessions)

These are NOT in scope for this spec, but are surfaced for future brainstorms. Each becomes its own session when opened.

### Q1. Stack reassessment — is Next.js + Supabase + Solana still right?

- *Trigger:* Stack friction during multi-tenant migration or Steward scaling.
- *First questions:* What's NOT working today? Where do we lose hours to friction? Is Supabase RLS still tractable at multi-tenant scale (50+ tenants × full schema)?
- *Rough position:* Stack is fine for v2. Vercel for Platforms makes the multi-tenant migration straightforward. AI Gateway via Vercel makes the Steward feasible at reasonable cost. Don't migrate unless a specific pain point dominates.

### Q2. RAG + vector database for the Steward

- *Trigger:* Steward needs memory across sessions, cross-tenant trend detection, or community-specific knowledge bases.
- *First questions:* What does the Steward need to "remember"? Per-community history? Cross-community trends? External data summaries?
- *Rough position:* Almost certainly needed in phase 2. Use `pgvector` (Supabase native) for embeddings; Anthropic prompt caching for in-context memory; don't add complexity until Steward MVP shows the concrete pain.

### Q3. Machine learning — scoring, fraud detection, alpha discovery

- *Trigger:* Scan needs more sophisticated than rule-based scoring; or sybil rings start exploiting Bronze→Silver paths.
- *First questions:* What ML problems are actually unsolved by good rule-based scoring? Where does ground truth come from?
- *Rough position:* Defer to phase 3+. Rules + heuristics get us much further than people expect. Add ML only when there's a labeled signal and clear value gap.

### Q4. Rebrand — parent-co naming, new logo, visual identity for 3 surfaces

- *Trigger:* Holder presentation needed near-term; Verified tier launch needs polished brand identity.
- *Status:* **Promoted to Sub-Session 10 (parallel track) — not deferred.** Initial work begins now alongside Phase A engineering.
- *First questions:* See Sub-Session 10 above.
- *Rough position:* "Organic" works as parent brand with Hub/Scan/Passport as sub-brands. Parent-co/legal-entity naming question = explicitly parked separate session (per session brief).

### Q5. Gamification depth — loyalty, badges, tournaments, NFTs as engagement hooks

- *Trigger:* Member retention plateaus on a tenant; engagement loop needs deeper hooks.
- *First questions:* Are sprints + rewards enough loop? What are players doing in the dead time between sprints? How do badges/NFTs amplify shareability?
- *Rough position:* Easter badges established the precedent. Future: per-tenant NFT minting at sprint milestones; cross-tenant tournament events; loyalty programs tied to holding-duration + activity.

### Q6. Reach + distribution channels

- *Trigger:* After Phase E (Scan + Verified) ships and we need top-of-funnel.
- *First questions:* Who are the top-10 priority launchpads/incubators? Content marketing strategy? Conference presence?
- *Rough position:* Launchpad partnerships (sub-session 9) are the primary growth wedge. Content marketing via "alpha picks" from Scan (publish weekly "undervalued communities" — generates organic interest). AMM/farming partnerships secondary.

### Q7. Mobile app

- *Trigger:* Web app retention shows mobile drop-off; or push notifications become critical for Steward nudges.
- *First questions:* PWA upgrade vs native? iOS App Store policies on crypto/wallet integration?
- *Rough position:* PWA upgrade first (cheap; reuses web stack). Native iOS only if wallet UX becomes the bottleneck.

### Q8. Token economics deep-dive

- *Trigger:* Verified tier launch (sets $ORG demand floor); or community asks for stronger utility narrative.
- *First questions:* What's the $ORG sink vs source balance? Passport stake — refundable, time-locked, slashed, or burned? Reward-pool fee — paid in $TOKEN or auto-swapped to $ORG?
- *Rough position:* Passport stake should be refundable but time-locked (1-year minimum) to deter Sybil-attempts. Reward-pool fee in $TOKEN (don't impose forced swaps). Verified subscription drives recurring $ORG demand.

---

## Verification & Success Criteria

How we'll know this design is working when v2 ships:

1. **Multi-tenant fundamentals work** — Two test communities can coexist with fully isolated members/proposals/sprints/treasury. RLS prevents data leakage. Cross-community visibility limited to public face.
2. **Onboarding under 15 minutes** — A new community founder can sign up, spawn their Bootstrap Constitution, and reach a fully-operational community space (with treasury, initial sprint, members joining) in under 15 minutes from first click.
3. **Treasury is non-custodial** — Organic NEVER holds a private key for any tenant's treasury. Verifiable via Squads on-chain explorer.
4. **Self-driving operations** — A community can run a full sprint cycle (proposal → vote → tasks → settlement → reward payout) with the Steward orchestrating, council signing, and no manual intervention from Cisco or any Organic-internal operator.
5. **Scan delivers real alpha** — Organic Scan can identify a "strong community, low token price" pair from public signals. Demonstrated with at least 3 real examples after public launch.
6. **Passport adopted by ≥1 external app** — At least one non-Organic Solana application reads the Passport credential for personhood gating, validating the B2B layer.
7. **Power-law revenue holds** — Within 6 months of Verified tier launch, top-10 successful tenants fund ≥80% of total infra cost.

---

## What's NOT In This Spec

- **Implementation tickets, file paths, migration SQL** — comes via writing-plans skill in dedicated sessions per sub-session above
- **Bonk partnership specifics** — deferred; this spec validates the prerequisite ("would a launchpad want this?")
- **Parent-co / naming question** — separate session (Q4 above)
- **Existing $ORG community migration to tenant 0** — its own sub-spec inside sub-session 1

---

## Status & Next Step

**Status:** Approved design from brainstorm 2026-05-11. Ready for execution planning.

**Two next steps in parallel:**

**Engineering track** — Open sub-session 1 (Multi-tenant data model migration) — bedrock dependency for everything in Phases A–F. Workflow:
1. Use `superpowers:writing-plans` skill on sub-session 1
2. Produce a focused implementation plan with file paths, migrations, sequencing
3. Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to execute
4. Repeat for sub-sessions 2-9 in the recommended order above

**Brand & Communication track** — Open sub-session 10 (Brand identity refresh) immediately. Runs alongside engineering, no shared dependencies. Once brand direction is established, sub-session 11 (Holder & partner presentation deck) follows — content from this spec, design from sub-session 10.

The engineering series spans roughly 3-6 months depending on parallelization. The brand + presentation track is on a faster timeline (~2-4 weeks for brand direction, +1-2 weeks for deck draft). The platform stays live and functional for $ORG throughout — every sub-session ships incremental value.
