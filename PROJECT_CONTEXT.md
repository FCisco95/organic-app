# PROJECT_CONTEXT.md
## Organic Platform

### 1. Project Overview

**Project name:** Organic

**One-liner:**  
Organic is a community-driven governance and execution platform designed to help memecoin communities actually become decentralized, not just claim to be.

**Core idea:**  
Most memecoin communities talk about being “CTO” or community-owned, but in practice decisions, execution, and rewards remain centralized or informal. Organic aims to turn community participation into a real, structured system where proposals, tasks, execution, and rewards are transparently coordinated and fairly distributed.

Organic is first being built for the Organic memecoin community, with the long-term vision of becoming a reusable platform that other projects can adopt.

---

### 2. Vision & Philosophy

Organic is built around a few core beliefs:

- Decentralization should be **practical**, not symbolic
- Communities should **build themselves**, not wait on founders
- Contribution should be **measurable**, **rewarded**, and **visible**
- Governance should be flexible and evolve over time
- The “trenches” of crypto should be more fair and less extractive

The platform is intentionally designed to evolve. Nothing is considered permanently locked at this stage.

---

### 3. What the Platform Does (Conceptually)

At a high level, Organic enables the following loop:

1. Community members create **proposals**
2. Proposals are **voted on**
3. Approved proposals enter a **backlog**
4. Backlog items are selected into **waves/sprints**
5. Tasks are executed by contributors with different roles
6. Contributors earn **points**
7. Points translate into **revenue share and influence**
8. The system learns and improves over time

Later stages introduce automation and AI-assisted coordination.

---

### 4. Roles & Participation

The platform is designed to support multiple community roles, including (but not limited to):

- Developers
- Content creators
- Community operators
- Strategists
- General contributors

Long-term idea:
- Introduce **learning paths / certifications**
- Certifications unlock or boost effectiveness in certain task types
- Certified roles may earn higher point multipliers for relevant work

Role systems are **not finalized** and expected to evolve.

---

### 5. Current State (Reality Check)

**What exists today:**
- User authentication
- Organic ID
- Basic task creation and editing
- Core pages and flows are mostly implemented
- Points concept exists
- Supabase backend is in place
- Solana wallet integration exists at a basic level

**What is incomplete or fragile:**
- Task flow logic is not fully tested
- Proposals → backlog → waves flow is not automated
- Voting logic needs refinement
- Security hardening is incomplete
- UI/UX is functional but not polished

**What does NOT exist yet:**
- Automated sprint/wave management
- AI/agent-based task scoring
- Revenue distribution logic
- Multi-sig treasury logic
- Certification system
- Multi-project / multi-tenant setup

---

### 6. Long-Term Ideas (Not Required Now)

These are **directional**, not requirements:

- AI agent that scores task quality and contribution fairness
- Automated sprint creation and closure
- Proposal-to-task transformation automation
- Multi-instance version of the platform for other projects
- SaaS-style monetization (subscription or license model)
- Community-managed treasury via multi-sig
- Revenue allocation governed by top contributors or point holders

Agents should **not** implement these unless explicitly asked.

---

### 7. Tech Stack (Current & Flexible)

**Current stack:**
- Frontend: Next.js (App Router)
- Styling: Tailwind CSS
- Backend: Supabase
- Blockchain: Solana
- Auth: Supabase Auth + wallet-based logic

**Notes:**
- UI framework usage (e.g. shadcn) is unclear and open to revision
- Stack is **not locked**
- Open to changes if there is strong justification
- Preference is for simplicity, security, and maintainability

---

### 8. Design & UX Principles

- Simple over clever
- Transparent over abstract
- Power-user friendly, but not overwhelming
- Clear flows: proposal → decision → execution → reward
- UI should make governance feel tangible and understandable

UI revamp is explicitly desired.

---

### 9. Security & Environment

- Security matters, but perfection is not expected at this stage
- Environment separation and best practices are important
- Agents should flag risks clearly
- No silent assumptions about trust or permissions

---

### 10. How Agents Should Work

**Agents are encouraged to:**
- Ask clarifying questions
- Challenge assumptions respectfully
- Propose better architectures or flows
- Help structure systems before coding
- Improve planning and sequencing

**Agents should avoid:**
- Over-engineering early features
- Rewriting large parts without discussion
- Assuming finality in governance rules
- Locking decisions prematurely

For major changes: **ask first**.

---

### 11. Open Questions (Intentionally Open)

- What governance rules make sense at each stage?
- How automated should the system become, and when?
- How to balance flexibility vs abuse resistance?
- How to fairly score contributions across different roles?
- What should be on-chain vs off-chain?

These are areas where agent input is explicitly welcome.

---

### 12. Project Status Summary

Organic is an early-stage but functioning platform with a strong vision, partial implementation, and many open design decisions. The current priority is **improving structure, flow, UX, and planning**, not rushing features.

The goal is to build the *best possible version* of this system, starting with clarity.
