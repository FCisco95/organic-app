# Organic Hub — Visual Overhaul: Implementation Prompt & Plan

---

## The Prompt (copy-paste this to your coding assistant)

```
I need to reskin the Organic Hub dashboard (Next.js + Tailwind + shadcn/ui, deployed on Vercel)
to feel like a dark, animated, game-like experience — while keeping all existing functionality, 
routing, sidebar navigation, and data intact.

Here is the reference HTML file I'm attaching that shows the exact look I want. 
[ATTACH: organic-dashboard.html]

## What stays the same
- Sidebar navigation on the left (all routes, all links)
- All existing page sections: Hero, Trust Pulse, Proposals & Governance, Tasks & Rewards, 
  Sprint Cycles, Analytics, Treasury, Contributor Rankings, Activity Feed, Member Status, 
  Community Stats
- All data fetching, Solana wallet integration, i18n
- Component logic and state management
- The content scroll behavior (horizontal card scroll for "O que você pode fazer" section)

## What changes (VISUAL ONLY)

### 1. Color System — update `tailwind.config.ts` / CSS variables
Replace the current theme with this dark palette:
- `--bg: #060610` (near-black blue)
- `--surface: #0e0e1a` (card backgrounds)
- `--surface2: #161625` (nested elements, hover states)
- `--border: #22223a` (subtle borders)
- `--orange: #ff6b2c` (primary accent — keep the Organic brand orange)
- `--orange-glow: #ff6b2c55` (for box-shadows and glows)
- `--orange-dim: #ff6b2c15` (for radial gradient backgrounds)
- `--yellow: #ffb800` (secondary accent, gradients)
- `--green: #00e676` (active/success states)
- `--red: #ff4444` (live badges, closed proposals)
- `--purple: #a855f7` (rankings accent)
- `--cyan: #22d3ee` (activity count accent)
- `--text: #e8e8f0` (primary text)
- `--text-dim: #8888aa` (secondary text)
- `--text-dimmer: #555570` (labels, meta)

### 2. Typography
- Display/headings: `Outfit` (weights 700-900, tight letter-spacing -2px for hero)
- Mono/numbers: `Space Mono` (for XP values, countdowns, stats, vote percentages)
- Body: `Outfit` (weights 400-500)
- Load via Google Fonts or `next/font`

### 3. Background & Atmosphere
- Subtle grid overlay on body: 60px grid lines in orange at 3.5% opacity
- Noise texture overlay using SVG feTurbulence filter at 2.5% opacity
- Radial gradient blobs behind the hero section (orange bottom-left, purple top-right)
- Floating particles: 25 small dots (1-3px), orange, fixed position, 5-25% opacity

### 4. Card Styling
- `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 18px`
- On hover: border transitions to `rgba(255, 107, 44, 0.3)`, subtle translateY(-3px), 
  `box-shadow: 0 8px 30px rgba(0,0,0,0.3)`
- Top-edge glow on hover: 2px gradient line (transparent → orange → transparent)
- Shimmer effect on hover: a gradient sweep from left to right across the card

### 5. Animations (use Framer Motion since you're in Next.js/React)
- **Staggered fade-in-up** on page load for all sections (0.6s ease, 100ms stagger)
- **Proposal items**: slide right 4px on hover
- **Activity feed items**: slide-in from left on mount
- **XP bar**: animate width from 0% to actual value over 2s with ease-out
- **Community stat numbers**: count-up animation when scrolled into view (use 
  Intersection Observer)
- **Sprint countdown**: live ticking timer (update every second)
- **Live activity**: new items auto-prepend every ~5 seconds
- **Hero characters**: gentle bobbing animation (translateY 0 → -14px, 5s infinite)

### 6. Section Labels
- Small uppercase labels above each section: `font-size: 10px`, `letter-spacing: 2px`, 
  `color: var(--text-dimmer)`, with a horizontal line extending to the right
- Example: `PULSO DE CONFIANÇA ————————————————`

### 7. Emoji System
Use emojis as visual anchors throughout the dashboard:
- Trust Pulse cards: ⏳ Sprint, 📋 Proposals, 🏆 Ranking, 🔥 Activity
- Feature cards: 📜 Proposals, ✅ Tasks, 🏃 Sprints, 📊 Analytics, 🏦 Treasury, 🏅 Rankings
- Activity avatars: 🐉 Dragon, 🦊 FoxFed, 🤖 Gen-1, 💀 Sniper, 🐕 WangChai
- Member badges: ✅ Verified, 🏛️ Council, 🎯 Orgasm count, 🔓 Governance access
- **Custom emojis to create**: Organic logo emoji (🧡 as placeholder), BORG token emoji 
  (use a small SVG or image sprite)

### 8. Interactive Fun Elements (NEW — add as a separate component)
- **Ghost/Sniper Hunting Mini-Game**: Spawn clickable character images (the Sniper character) 
  randomly on the page every ~2.5 seconds. They float around with a bobbing animation. 
  Clicking them triggers a "pop" animation and increments a score counter fixed in the 
  top-right. This is a fun Easter egg that makes the dashboard playful.
- **Rocket cursor follower**: A 🚀 emoji that follows the mouse with a slight delay 
  (CSS transition 0.12s). Sits at z-index 998.
- These should be toggleable (add a small button to enable/disable them).

### 9. Buttons
- Primary: `background: linear-gradient(135deg, #ff6b2c, #ff8844)`, black text, 700 weight, 
  rounded-xl. Hover: translateY(-2px), orange glow shadow
- Secondary: `background: var(--surface2)`, border, white text. Hover: border turns orange

### 10. Live Badge
- Red background, white text, 9px uppercase with 1px letter-spacing
- Pulsing opacity animation (1 → 0.6 → 1, 2s infinite)

### 11. Sidebar Updates
- Match the dark theme: bg should be `var(--bg)` or slightly lighter
- Active link gets an orange left-border or bottom-accent
- Subtle hover background on links
- Organic logo at top with the orange gradient glow

## Implementation Order
1. Create branch `feat/visual-overhaul`
2. Update global CSS variables and Tailwind config (colors, fonts)
3. Update layout.tsx / global background (grid, noise, particles)
4. Restyle the sidebar component
5. Restyle card components (the base Card used everywhere)
6. Update the hero section (gradient background, heading styles, character emojis)
7. Update each dashboard section one by one (Trust Pulse → Feature Cards → Activity → 
   Member Status → Community Stats)
8. Add animations (Framer Motion variants for fade-in, stagger)
9. Add fun interactive elements (rocket cursor, sniper game) as a toggleable overlay component
10. Test on mobile (responsive adjustments)
11. QA pass for readability, contrast, and wallet connection flows
12. Merge to main

## Files likely to touch
- `tailwind.config.ts` — colors, fonts, extend theme
- `app/globals.css` — CSS variables, background effects, noise, grid
- `app/layout.tsx` — font imports, body classes
- `components/ui/*` — Card, Button, Badge restyling
- `components/sidebar.tsx` — dark theme, active states
- `app/[locale]/page.tsx` (or equivalent home page) — hero, section order, emoji integration
- New: `components/fun/rocket-cursor.tsx` — mouse follower
- New: `components/fun/sniper-game.tsx` — clickable targets mini-game
- New: `components/fun/particles.tsx` — floating particle background
- New: `components/animations/fade-in.tsx` — reusable Framer Motion wrapper

Do NOT change any data fetching, API calls, wallet logic, or routing. 
This is purely a visual/animation layer on top of the existing app.
```

---

## Git Workflow

```bash
# 1. Create the branch
git checkout -b feat/visual-overhaul

# 2. Work through the implementation order above

# 3. Commit in logical chunks
git add -A && git commit -m "feat: dark theme color system + typography"
git add -A && git commit -m "feat: background atmosphere (grid, noise, particles)"  
git add -A && git commit -m "feat: card restyling with hover effects"
git add -A && git commit -m "feat: sidebar dark theme"
git add -A && git commit -m "feat: hero section with gradient + emojis"
git add -A && git commit -m "feat: section-by-section dashboard restyling"
git add -A && git commit -m "feat: framer motion animations"
git add -A && git commit -m "feat: interactive fun elements (rocket, sniper game)"
git add -A && git commit -m "fix: mobile responsive adjustments"

# 4. Push and create PR
git push origin feat/visual-overhaul
# Create PR: "Visual Overhaul — Dark Animated Theme"

# 5. Preview on Vercel preview deployment before merging
# 6. Merge to main when satisfied
```

---

## Custom Emoji Sprites to Create

You'll want small PNG/SVG sprites (24x24 or 32x32) for:

1. **Organic emoji** — stylized "O" with the orange gradient, used wherever you'd use 🧡
2. **BORG token emoji** — the BORG token icon, used in treasury/rewards contexts
3. **Character avatars** — tiny versions of Dragon, Fox, Gen-1, Sniper, WangChai 
   for the activity feed (you already have the full images)

Place these in `public/emojis/` and create a small `<Emoji name="organic" />` component 
that renders them inline at the right size.

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Dark mode only? | Yes, dark only | Matches crypto/DAO aesthetic, your brand is orange-on-dark |
| Animation library | Framer Motion | Already standard in Next.js ecosystem, great for stagger/scroll |
| Font loading | `next/font/google` | Best performance with Next.js, no layout shift |
| Particles | Pure CSS (fixed divs) | No library needed, lightweight, zero JS overhead |
| Grid background | CSS `background-image` | Single line, no DOM elements, no JS |
| Sniper game | Vanilla JS in a React component | Simple, no dependencies, easily removable |
| Emoji system | Mix of native + custom sprites | Native for universal ones, sprites for brand-specific |

---

## What's NOT in the reference HTML (things to add for your real app)

The reference is a static mockup. Your real implementation will also need:

- **Connected wallet state** — the member section should reflect actual wallet data
- **Real proposal data** — fetched from your API/Solana program
- **Real activity feed** — connected to your actual event system
- **Horizontal scroll section** — your "O que você pode fazer" cards with the swipe/scroll
- **i18n** — all text through your translation system, not hardcoded
- **Responsive sidebar** — toggle behavior on mobile stays as-is
- **Loading states** — skeleton cards with the dark theme shimmer effect
- **Toast/notification styling** — match the dark theme
