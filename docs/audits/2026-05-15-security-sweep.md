# Security Audit — organic-app

**Run:** `/security-sweep audit`
**Date:** 2026-05-15 13:09 UTC
**Repo:** git@github.com:FCisco95/organic-app.git
**Branch:** `phase/sprint-task-voting-d1`
**Commit:** `ea27845279ce0efa5955bb0d1d5f2503a6884637`
**Mode:** read-only — no files modified, no commits created, `.gitignore` untouched

## Stack detected

- **Primary pack:** `nextjs-vercel`
- **Secondary packs:** none (no `/server/*.py` found — polyglot overlay not loaded)
- **Overlays:** none (no monorepo signals)
- **Stripe pack:** skipped (`stripe` not in dependencies)
- **Solana pack hints:** wallet linking present at `src/app/api/auth/link-wallet/route.ts` (uses `tweetnacl.sign.detached.verify` ✓)

## Summary

| Severity | Count |
|---|---|
| Critical | **2** |
| High     | **5** |
| Medium   | **6** |
| Low      | **2** |
| **Total** | **15** |

| Fix class | Count |
|---|---|
| Auto-fixable | 5 |
| Assisted     | 4 |
| Human-only   | 6 |

> **Post-audit verification (2026-05-15):** The "Solana RPC URL may leak" finding has been downgraded from High to PASS after grep'ing the live bundles — no paid-provider key is in the browser. See the struck-through entry under "High" below.

### Pre-empted concern (U2 — committed `.env*` files)

You expected this run to flag 5 committed `.env*` files. **It did not.** Both the current tree and the full git history are clean of tracked `.env`, `.env.local`, `.env.production`, etc. The only matched path is `.env.local.example`, which is the intended template. No keys need rotating from a U2-trigger perspective. Verified by:

```bash
git ls-files | grep -E '^(\.env|.*/\.env)(\..*)?$' | grep -v -E '\.env\.example$'
# → only .env.local.example

git log --all --pretty=format: --name-only --diff-filter=A | sort -u | grep -E '\.env'
# → only .env.local.example (added once, never a real .env)
```

If your memory was from a different repo or pre-organic-app history, fine — this repo is clean.

---

## Critical findings (block deploy / require immediate action)

### [U4 / NX12] `next@14.2.35` — 4 unpatched HIGH advisories on the 14.x line

- **Where:** `package.json` (`"next": "^14.2.0"`); installed: `14.2.35`
- **Detail:** `next@14.2.35` is shipped, but the 14.x line **does not receive backports** for the following High-severity advisories. All require an upgrade to `next@15.5.16` or `next@16.x`:
  - **GHSA-c4j6-fc7j-m34r** — SSRF via WebSocket upgrades (CVSS **8.6**)
  - **GHSA-36qx-fr4f-26g5** — Middleware/Proxy bypass in Pages Router using i18n (CVSS 7.5). *Mitigation: the repo uses App Router, so this is lower practical risk — still patched only in 15.5.16+*.
  - **GHSA-q4gf-8mx6-v5v3** & **GHSA-8h8q-6873-q5fj** — DoS via Server Components (CVSS 7.5)
  - **GHSA-h25m-26qc-wcjf** — DoS via HTTP request deserialization (CVSS 7.5)
  - **GHSA-ffhc-5mcf-pf4q** — XSS in App Router apps using **CSP nonces** (this repo's middleware sets a nonce CSP at `src/middleware.ts:191`, so this is *directly applicable*)
  - **GHSA-9g9p-9gw9-jx7f** — DoS via Image Optimizer remotePatterns (moderate)
- **Fix class:** assisted — `npm i next@15.5.16` (or `next@16.2.6` if you want latest). This is a **major upgrade** with breaking changes (App Router APIs change between 14 → 15 → 16). Plan a dedicated branch.
- **Note on CVE-2025-29927** (the original middleware-subrequest bypass): you are already patched for this in `14.2.35` *and* you defensively strip the header at `src/middleware.ts:222`. That one is fine. The advisories above are newer.
- **See:** `~/.claude/skills/security-review/references/07a-nextjs-vercel.md#middleware-bypass-cve-2025-29927`, `~/.claude/skills/security-review/references/13-cve-watchlist.md`

### [U4] `axios` 13 stacked advisories including auth-bypass via prototype pollution

- **Where:** `package-lock.json` (transitive — likely via `@reown/appkit`, `@walletconnect/*`, or another wallet/SDK dep). Not a direct dependency.
- **Detail:** Currently resolved to a version in the vulnerable range `1.0.0 — 1.15.1`. Stack-up of 13 GHSAs including:
  - **GHSA-w9j2-pvgh-6h63** — Authentication Bypass via Prototype Pollution Gadget in `validateStatus`
  - **GHSA-m7pr-hjqh-92cm** — `no_proxy` bypass via IP alias → **SSRF**
  - **GHSA-3w6x-2g7m-8v23** — Invisible JSON response tampering via `parseReviver` prototype pollution
  - **GHSA-q8qp-cvcw-x6jj** — HTTP adapter prototype pollution read-side gadgets allowing credential injection and request hijacking
  - 9 more (CRLF injection, header injection, XSRF token leakage, etc.)
- **Fix class:** assisted — `fixAvailable: true` per `npm audit` (non-major). Run `npm audit fix` for axios specifically; verify with `npm ci`.
- **See:** `~/.claude/skills/security-review/references/08-supply-chain.md` and `02-owasp-web.md#5-ssrf`

---

## High

### [NX9] `import 'server-only'` missing on modules that read service-role secrets

- **Where:**
  - `src/lib/supabase/server.ts` — exports `createServiceClient()`
  - `src/features/market-data/server/service.ts` — uses `createServiceClient` + reads `SUPABASE_SERVICE_ROLE_KEY`
  - `src/lib/solana/rpc-fixture.ts` — directly references `SUPABASE_SERVICE_ROLE_KEY`
  - (`src/app/api/disputes/[id]/route.ts` matched too but route handlers are inherently server-only in Next.js — lower priority)
- **Detail:** Without an `import 'server-only'` first line, a future client component import would silently bundle service-role-touching code to the browser. Today, `src/lib/supabase/server.ts` imports `next/headers.cookies()` which would throw at build, so accidental bundling currently fails loudly — but that's a happy accident, not a defense.
- **Fix class:** assisted — prepend `import 'server-only';` to each file. Run `npm run build` to confirm no client component pulls them in.
- **See:** `~/.claude/skills/security-review/references/07a-nextjs-vercel.md#environment-variable-exposure`

### [U4] `@solana/spl-token` (via `bigint-buffer`) — buffer overflow

- **Where:** `package.json` (`"@solana/spl-token": "^0.4.0"`)
- **Detail:** GHSA-3gc7-fjrx-p6mg — `bigint-buffer.toBigIntLE()` buffer overflow. `npm audit` proposes a **major downgrade** to `@solana/spl-token@0.1.8`. That's almost certainly the wrong direction; verify whether a newer 0.4.x patch exists upstream or whether the actual exploit path is reachable in your token-balance code.
- **Fix class:** human-only — needs judgment. **Do not run `npm audit fix --force`** without manual verification.
- **See:** `~/.claude/skills/security-review/references/05-blockchain-solana.md`, `~/.claude/skills/security-review/references/08-supply-chain.md`

### [U4] `lodash` prototype pollution (`_.unset`, `_.omit`, `_.template`)

- **Where:** transitive in `package-lock.json` (range `<=4.17.23`)
- **Detail:** Three GHSAs — including code injection via `_.template`. Fix available (non-major).
- **Fix class:** assisted — `npm audit fix` or `npm i lodash@latest` if a direct dep exists; otherwise pin the transitive via `overrides` in `package.json`.
- **See:** `~/.claude/skills/security-review/references/08-supply-chain.md`

### [U11] No CI security scanners configured

- **Where:** `.github/workflows/` — five workflows (`ci.yml`, `engagement-appeals-sweep.yml`, `engagement-poll.yml`, `market-cache-refresh.yml`, `supabase-migration-sync.yml`), **none** run gitleaks, `npm audit`, lockfile-lint, or trivy.
- **Detail:** Today this audit is the only thing that would catch newly-leaked secrets or vuln deps. No automated regression net on PRs.
- **Fix class:** auto-fixable — `/security-sweep fix` will write `.github/workflows/security.yml` with SHA-pinned actions.
- **See:** `~/.claude/skills/security-review/references/00-pre-deploy-checklist.md#ci`

### ~~[Custom] Solana RPC URL exposed via `NEXT_PUBLIC_SOLANA_RPC_URL`~~ — **VERIFIED PASS (2026-05-15)**

- **Verification:** Downloaded all 17 JS chunks from the live deployment (`/_next/static/chunks/*.js`) and grep'd for paid-provider Solana RPC patterns. Result:
  - **No** `*.helius.dev` / `*.helius-rpc.com` / `mainnet.helius` matches
  - **No** Solana-flavored `*.quiknode.pro` URL (only Reown SDK's bundled EVM fallbacks — vendor's keys, not the user's)
  - **No** `?api-key=` query strings on any Solana endpoint
  - **Only** Solana RPC endpoints present in bundles: `https://api.mainnet-beta.solana.com` (free public), `https://rpc.walletconnect.org/v1` (WalletConnect's free proxy via Reown AppKit), plus devnet/testnet
- **Conclusion:** `NEXT_PUBLIC_SOLANA_RPC_URL` is either unset in production (falls back to `clusterApiUrl('mainnet-beta')`) or explicitly set to a public endpoint. **No paid key is shipped to browsers.** The paid Helius/QuickNode endpoints whitelisted in CSP are used server-side via the `/api/solana/*` proxy routes — the correct pattern.
- **No rotation needed.**
- **See:** `~/.claude/skills/security-review/references/05-blockchain-solana.md`, `~/.claude/skills/security-review/references/07a-nextjs-vercel.md#environment-variable-exposure`

### [NX-auth] Rate-limit coverage gap on API routes

- **Where:** `src/app/api/**/route.ts`
- **Detail:** 163 route handlers total; only ~28 (17%) reference a rate-limit primitive. Unrate-limited public POST endpoints are the most common DoS / cost-attack vector on Vercel (each invocation is billed; bots can drain Spend Management caps).
- **Fix class:** human-only — needs route-by-route judgment about which are public-writable vs read-only-cached. Suggest categorizing the public-write routes and applying a sliding-window limit (already a pattern in the codebase — extend it).
- **See:** `~/.claude/skills/security-review/references/09-rate-limiting-ddos.md`, `~/.claude/skills/security-review/references/07a-nextjs-vercel.md#spend-management`

---

## Medium

### [U10] `productionBrowserSourceMaps` not set in `next.config.js`

- **Where:** `next.config.js` — flag is absent
- **Detail:** Defaults to `false`, but explicit is better (and protects against an env-driven `true` slipping through). Also, source maps in prod expose original module names / business logic.
- **Fix class:** auto-fixable — add `productionBrowserSourceMaps: false`.
- **See:** `~/.claude/skills/security-review/references/06-headers-csp-cookies.md#section-1-complete-nextconfigjs-baseline`

### [U16] `Permissions-Policy` header is incomplete

- **Where:** `next.config.js:36`
- **Detail:** Current value: `camera=(), microphone=(), geolocation=()`. Missing `browsing-topics`, `payment`, `usb`, `interest-cohort` — all of which should be explicitly disabled for a non-FedEx web app.
- **Fix class:** auto-fixable — extend the header value.
- **See:** `~/.claude/skills/security-review/references/06-headers-csp-cookies.md`

### [U12] Dependabot not configured

- **Where:** missing `.github/dependabot.yml`
- **Detail:** No automated dep update PRs. Combined with U11, you have zero supply-chain hygiene on autopilot.
- **Fix class:** auto-fixable — write the stub with `npm` + `github-actions` ecosystems.
- **See:** `~/.claude/skills/security-review/references/08-supply-chain.md`

### [Custom] ~33 route handlers lack an obvious auth/session check

- **Where:** ~33 of 163 `src/app/api/**/route.ts` files don't grep for `getUser|getSession|auth(|requireAuth|verifySession`
- **Detail:** This is a fuzzy heuristic — some are legitimately public (health, public stats, leaderboard). Cannot be auto-fixed; needs a manual review pass to confirm intent.
- **Fix class:** human-only — produce a list, mark each "intentional public" or "missing auth", patch the latter.
- **See:** `~/.claude/skills/security-review/references/07a-nextjs-vercel.md#server-actions--public-post-endpoints`

### [Custom] Wide-open `USING (true)` RLS policies in initial schema

- **Where:** `supabase/migrations/20250101000000_initial_schema.sql` — 8 `USING (true)` clauses (lines 202, 211, 239, 254, 277, 291, 308, 322)
- **Detail:** These are typically intentional read-public policies (e.g. published posts visible to anonymous). But "intentional" needs verification — a `FOR ALL ... USING (true)` would be a critical leak; a `FOR SELECT ... USING (true)` on an explicitly-public table is fine. Cannot be classified from grep alone.
- **Fix class:** human-only — read each policy in context, confirm it's `FOR SELECT` only and on a public-data table. Document the intent in a comment or via the security-overlay's project notes.
- **See:** `~/.claude/skills/security-review/references/03-auth-supabase.md#policy-patterns`, `~/.claude/skills/security-review/references/03-auth-supabase.md#rls-checklist`

### [NX-input] Zod coverage gap

- **Where:** route handlers across `src/app/api/`
- **Detail:** 152 route files don't directly reference `z.` — many import shared schemas from `src/lib/zod/`, so this is a noisy signal, not an actionable finding on its own. Mentioned for completeness; recommend a follow-up coverage report rather than treating as a fix.
- **Fix class:** human-only — produce a coverage report cross-referencing imports.

---

## Low

### [U17] SRI on external scripts

- **Detail:** No `<script src="https://…">` tags found in app source. Next.js bundles everything; CSP `script-src` uses `'nonce'` + `'strict-dynamic'`. PASS, but consider adding a suppression entry in `security.config.yaml` for clarity on future runs.

### [Workflow housekeeping] `SECURITY_AUDIT.md` not in `.gitignore`

- **Detail:** The skill normally appends this filename to `.gitignore` on first run, but you asked for read-only audit mode. Add manually before running `/security-sweep fix`:
  ```bash
  echo "SECURITY_AUDIT.md" >> .gitignore
  ```

---

## Passing (verified, no action needed)

| Code | Check | Status |
|---|---|---|
| U1 | Secrets in tree (gitleaks regex fallback over tracked files) | PASS |
| U1 | Secrets in full git history (regex sweep) | PASS — 0 matches |
| U2 | `.env*` files committed (tree + history) | PASS — only `.env.local.example` |
| U3 | Lockfile committed | PASS — `package-lock.json` present |
| U5 | GitHub Actions pinned to SHA | PASS — all `uses:` lines are 40-char SHAs with `# v4` comments |
| U6 | `lockfile-lint --validate-https --allowed-hosts npm` | PASS |
| U7 | Secrets in `.md` / `.mdx` | PASS |
| U8 | Placeholder secrets in code | PASS |
| U9 | MCP server config (`.mcp.json` at root) | PASS — file doesn't exist; `.claude/mcp.json` is gitignored project-local config |
| U13 | `/.git` / `/.env` deployed exposure | NOT TESTED — `target_url` not set in `security.config.yaml`. Vercel default-denies these; treat as PASS unless you've customized routing. |
| U14 | CORS `*` + credentials true | PASS — no wildcard CORS in source |
| U15 | Hardcoded localhost in prod paths | PASS |
| U18 | `.claude/settings.local.json` gitignored | PASS |
| U19 | `.npmrc` / `.netrc` tokens | PASS |
| NX1 | HSTS `max-age >= 31536000`, `includeSubDomains`, `preload` | PASS (`max-age=63072000; includeSubDomains; preload`) |
| NX2 | `X-Frame-Options: DENY` | PASS |
| NX3 | `X-Content-Type-Options: nosniff` | PASS |
| NX4 | `Referrer-Policy: strict-origin-when-cross-origin` | PASS |
| NX5 | CSP includes `frame-ancestors 'none'` AND `object-src 'none'` | PASS (set in middleware nonce-CSP) |
| NX6 | `poweredByHeader: false` | PASS |
| NX7 | Middleware strips `x-middleware-subrequest` | PASS (`src/middleware.ts:222`) |
| NX8 | `images.remotePatterns` is explicit allowlist (no `**`) | PASS — `**.supabase.co`, `raw.githubusercontent.com`, `pbs.twimg.com` |
| NX10 | Server Actions have auth checks | N/A — 0 `'use server'` directives in source; routes are handled by Route Handlers instead |
| NX11 | `NEXT_PUBLIC_` prefix on known-sensitive keys | PASS (matches are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SOLANA_RPC_URL` — both intended-public; see Custom High finding above for RPC nuance) |
| NX13 | React patched (CVE-2025-55182) | `react@18.3.1` — verify against `~/.claude/skills/security-review/references/13-cve-watchlist.md`; no `npm audit` advisory in current scan |
| NX14 | `experimental.serverActions.allowedOrigins` | N/A — no Server Actions in use |
| NX15 | Cookies have `httpOnly`/`secure`/`sameSite` | PASS — no direct `cookies().set` writers; Supabase SSR helper handles cookie attrs |
| Solana wallet sig verify | `tweetnacl.sign.detached.verify` at `src/app/api/auth/link-wallet/route.ts:88` | PASS |
| Service-role in client components | None (grep across `src/app/**/page.tsx` + `'use client'`) | PASS |
| RLS DISABLE vs ENABLE | 90 `ENABLE`, 0 `DISABLE` statements across 115 migrations | PASS at coarse level |

---

## Scanner output (raw)

<details>
<summary>npm audit (high/critical only)</summary>

```
{
  "summary": { "info": 0, "low": 28, "moderate": 6, "high": 6, "critical": 0, "total": 40 },
  "high_critical": [
    { "name": "@solana/buffer-layout-utils", "severity": "high", "range": "*",
      "fix": { "name": "@solana/spl-token", "version": "0.1.8", "isSemVerMajor": true } },
    { "name": "@solana/spl-token", "severity": "high", "range": ">=0.2.0-alpha.0",
      "fix": { "name": "@solana/spl-token", "version": "0.1.8", "isSemVerMajor": true } },
    { "name": "axios",   "severity": "high", "range": "1.0.0 - 1.15.1", "fix": true },
    { "name": "bigint-buffer", "severity": "high", "range": "*",
      "fix": { "name": "@solana/spl-token", "version": "0.1.8", "isSemVerMajor": true } },
    { "name": "lodash",  "severity": "high", "range": "<=4.17.23", "fix": true },
    { "name": "next",    "severity": "high", "range": "9.3.4-canary.0 - 16.3.0-canary.5",
      "fix": { "name": "next", "version": "16.2.6", "isSemVerMajor": true } }
  ]
}
```

</details>

<details>
<summary>gitleaks (regex fallback — gitleaks binary not installed locally)</summary>

```
Working-tree scan over tracked files (excluding .lock, .svg, node_modules, .next):
  → 0 matches against the standard pattern set
    (sk-/sk_live/sk_test/rk_live, ghp_/gho_/github_pat_, AKIA, AIza, ya29., PEM private keys, JWT-shaped tokens)

Full-history scan (git log --all -p):
  → 0 matches across full diff history

NOTE: This is a regex fallback. Install gitleaks for the canonical scan:
  brew install gitleaks
  gitleaks detect --source . --no-banner --redact
```

</details>

<details>
<summary>lockfile-lint</summary>

```
✔ No issues detected
```

</details>

<details>
<summary>RLS statement totals (sanity check across migrations)</summary>

```
ENABLE ROW LEVEL SECURITY statements: 90
DISABLE ROW LEVEL SECURITY statements: 0
USING (true) policies in 20250101000000_initial_schema.sql: 8 (lines 202, 211, 239, 254, 277, 291, 308, 322)
```

</details>

---

## Suppressed (with reason)

| Code | Reason | Added |
|---|---|---|
| (none yet) | First run — no `security.config.yaml` exists. Once `/security-sweep fix` runs, create one to suppress noisy checks like U17 (no external CDN scripts) if desired. | — |

---

## Recommendation for next step

**Do NOT run `/security-sweep fix` yet.** The auto-fixable batch (U10, U11, U12, U16, plus possibly U17 suppression) is small and safe, but the Critical findings are entirely human-only or assisted and **dominate the risk profile**. Specifically:

1. ~~**First — verify the Critical RPC-URL exposure.**~~ **DONE 2026-05-15 — verified clean.** Bundle contains only `api.mainnet-beta.solana.com` and WalletConnect's free RPC. No paid-provider key shipped to browsers.
2. **Plan the `next` major upgrade.** `next@14` → `next@15.5.16+` (or `16.2.6`) is the only way to clear the 4 unpatched HIGHs. Allocate a dedicated branch; expect API-breakage to fix (e.g. cookies API, async params, route handler signatures). This is a multi-hour task, not a sweep-fix.
3. **`npm audit fix` for axios + lodash.** Verify lockfile is clean afterward (`npm ci`). Optional: add a `package.json` `overrides` block to pin the transitive axios version explicitly.
4. **Manually triage the 33 routes lacking obvious auth checks** + the 8 `USING (true)` RLS policies. Both are domain-knowledge calls.
5. **Then — run `/security-sweep fix`** to apply the safe-set hardenings (auto-fixable batch + the `server-only` imports if you approve them per-file). The auto-fixable batch is purely additive — `productionBrowserSourceMaps: false`, extending Permissions-Policy, adding `.github/workflows/security.yml`, adding `.github/dependabot.yml`. None of those break anything.

### Keys to rotate (if any)

- **None.** Verified: `NEXT_PUBLIC_SOLANA_RPC_URL` does not leak a paid key (live bundle grep, 2026-05-15). Gitleaks regex sweep is clean across tree and history.

---

## Top 5 Critical / High by impact

| # | ID | One-line | Where | Reference |
|---|---|---|---|---|
| 1 | U4/NX12 | `next@14.2.35` ships 4 unpatched HIGH CVEs (incl. SSRF CVSS 8.6) — needs major upgrade to 15.5.16+ | `package.json` | `security-review/13-cve-watchlist.md`, `security-review/07a-nextjs-vercel.md` |
| 2 | U4 | `axios` chain of 13 GHSAs (auth bypass + SSRF + JSON tampering via prototype pollution) | transitive in `package-lock.json` | `security-review/08-supply-chain.md`, `security-review/02-owasp-web.md#5-ssrf` |
| 3 | ~~Custom~~ | ~~`NEXT_PUBLIC_SOLANA_RPC_URL` may embed a paid Helius/QuickNode key~~ — **verified PASS**, bundle contains only public endpoints | — | — |
| 4 | NX9 | `import 'server-only'` missing on 3 service-role modules | `src/lib/supabase/server.ts`, `src/features/market-data/server/service.ts`, `src/lib/solana/rpc-fixture.ts` | `security-review/07a-nextjs-vercel.md#environment-variable-exposure` |
| 5 | U4 | `@solana/spl-token` + `lodash` prototype pollution & buffer overflow advisories | transitive in `package-lock.json` | `security-review/05-blockchain-solana.md`, `security-review/08-supply-chain.md` |

---

## Run history

| Date | Argument | Findings (C/H/M/L) | Resolved | Commit |
|---|---|---|---|---|
| 2026-05-15 | audit | 2/6/6/2 | — | — |
