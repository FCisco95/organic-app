# CI Deterministic Green Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub Actions CI pass deterministically on every PR by fixing real vulnerabilities, replacing a brittle grep-based audit allowlist, eliminating shared-Supabase schema drift, and removing test dependence on live Solana mainnet data.

**Architecture:** Four independent, committable phases. Phase 1 and 2 fix `security-audit`. Phase 3 replaces the shared hosted CI Supabase project with an ephemeral local Supabase started inside each CI job. Phase 4 introduces a `SolanaRpc` interface with a fixture implementation so e2e tests are no longer coupled to mainnet BONK supply values.

**Tech Stack:** GitHub Actions, npm, `audit-ci` (new devDep), Supabase CLI (`supabase start`/`db reset`), `@solana/web3.js`, Playwright, TypeScript.

**Execution order:** Phase 1 → Phase 2 → Phase 3 → Phase 4. Each phase is a separate branch (`fix/ci-vulns`, `chore/ci-audit-ci`, `chore/ci-local-supabase`, `refactor/solana-rpc-fixture`) and separate PR. Phases 1+2 and 3+4 can be merged in either order, but Phase 4's verification depends on Phase 3 being merged.

**Pre-flight (before starting Phase 1):**

1. `git switch main && git pull --ff-only`
2. Create a dedicated worktree via the `using-git-worktrees` skill for each phase, OR one worktree and rebase between phases. Do **not** execute this plan on `phase/translation-expansion`.
3. Verify the account used for `gh` has Supabase CLI access (needed for smoke-testing Phase 3 locally): `supabase --version` should print a version ≥ 1.190.

---

## Phase 1: Patch real npm vulnerabilities

**Why this exists:** A critical `axios` SSRF advisory (GHSA-3p68-rc4w-qgx5) plus high/critical advisories on `defu`, `flatted`, `glob`, `brace-expansion`, `js-yaml`, `@anthropic-ai/sdk` all appeared between 2026-03-19 and 2026-04-11. The current audit gate at `.github/workflows/ci.yml:53` only pardons `bigint-buffer|elliptic|lodash|next ` so it fails on every PR. Phase 1 actually fixes the patchable ones; Phase 2 replaces the allowlist mechanism.

### Task 1.1: Create the phase branch

**Files:** none.

- [ ] **Step 1: Create branch off latest main**

```bash
git switch main
git pull --ff-only
git switch -c fix/ci-vulns
```

- [ ] **Step 2: Confirm baseline failure**

Run: `npm ci && npm audit --audit-level=high 2>&1 | grep -E "Severity: (high|critical)" | sort -u`
Expected: lines for `axios`, `defu`, `flatted`, `glob`, `brace-expansion` (and possibly `js-yaml`, `@anthropic-ai/sdk`, `bigint-buffer`, `elliptic`).

### Task 1.2: Run `npm audit fix` for safe upgrades

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Run non-forcing audit fix**

Run: `npm audit fix`
Expected: several advisories resolved without breaking changes. The tool will list which packages changed.

- [ ] **Step 2: Record which high/critical advisories remain**

Run: `npm audit --audit-level=high 2>&1 | grep -E "Severity: (high|critical)" | sort -u`
Expected remaining (acceptable — deep transitive, no fix without breaking change): `bigint-buffer`, `elliptic`, possibly `lodash` (from `@walletconnect/universal-provider`).

- [ ] **Step 3: If `axios` still shows critical, pin it explicitly**

Check: `npm ls axios`
If the output shows any version `<1.14.1`, run: `npm install axios@^1.14.1 --save-exact=false`
This forces a compatible resolution. If `axios` is transitive-only with no direct use, add an npm override in `package.json`:

```json
{
  "overrides": {
    "axios": "^1.14.1"
  }
}
```

Then re-run `npm install` and `npm audit`.

- [ ] **Step 4: Run the build to catch regressions from upgraded deps**

Run: `npm run lint && npm run build`
Expected: both pass. If lint fails only on unrelated issues, stop and investigate — do not force-merge.

### Task 1.3: Run the full test suite

**Files:** none.

- [ ] **Step 1: Unit tests**

Run: `npm test`
Expected: all tests pass. If a test fails because of an upgraded dep, that's the actual bug this phase protects against — investigate.

- [ ] **Step 2: Security tests**

Run: `./node_modules/.bin/vitest run tests/security/ --reporter=verbose`
Expected: all tests pass.

### Task 1.4: Commit and open PR

- [ ] **Step 1: Stage and commit**

```bash
git add package.json package-lock.json
git commit -m "fix(deps): patch axios SSRF + transitive high/critical advisories

Addresses GHSA-3p68-rc4w-qgx5 (axios SSRF via NO_PROXY bypass),
GHSA-fvcv-3m26-pcqx (axios header-injection cloud-metadata exfil),
plus defu/flatted/glob/brace-expansion/js-yaml/@anthropic-ai/sdk
high and critical advisories. Remaining advisories (bigint-buffer,
elliptic) are deep transitive on @solana/wallet-adapter-wallets with
no fix path short of a breaking upgrade; kept on the allowlist."
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin fix/ci-vulns
gh pr create --title "fix(deps): patch axios SSRF + transitive advisories" --body "$(cat <<'EOF'
## Summary
- Runs \`npm audit fix\` to clear high/critical advisories on axios, defu, flatted, glob, brace-expansion, js-yaml, and @anthropic-ai/sdk
- Remaining advisories (bigint-buffer, elliptic, lodash) are deep transitive via Solana wallet adapters with no non-breaking fix

## Test plan
- [x] \`npm run lint\`
- [x] \`npm run build\`
- [x] \`npm test\`
- [x] \`npx vitest run tests/security/\`
- [ ] CI \`security-audit\` job turns green
EOF
)"
```

- [ ] **Step 3: Verify the `security-audit` job passes on the PR**

Run: `gh pr checks --watch`
Expected: `security-audit` → success. (`e2e-*` jobs will still fail — Phase 3 fixes those.)

- [ ] **Step 4: Merge when green**

Ask the user to merge. Do not self-merge without explicit approval.

---

## Phase 2: Replace grep allowlist with `audit-ci`

**Why this exists:** The current gate is one line of bash with a 4-package regex allowlist. Every new advisory breaks CI until someone edits the regex. `audit-ci` is a mature tool with structured, dated allowlist entries that force re-evaluation instead of silent expansion.

### Task 2.1: Create the phase branch

- [ ] **Step 1: Branch off latest main**

```bash
git switch main
git pull --ff-only
git switch -c chore/ci-audit-ci
```

### Task 2.2: Install `audit-ci` as a devDependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install**

Run: `npm install --save-dev audit-ci@^7.1.0`

- [ ] **Step 2: Verify install**

Run: `npx audit-ci --version`
Expected: `7.x.x`.

### Task 2.3: Author the `audit-ci` config

**Files:**
- Create: `audit-ci.jsonc`

- [ ] **Step 1: Write the config**

Create `audit-ci.jsonc` with exactly this content:

```jsonc
{
  // audit-ci runs `npm audit` and fails CI if advisories are newer or
  // more severe than the rules below allow.
  //
  // Docs: https://github.com/IBM/audit-ci
  //
  // Policy: fail on any new high/critical advisory. Allowlist is only
  // for transitive-only advisories we cannot patch without breaking
  // upgrades. Every entry has an `expires` date forcing re-review.

  "high": true,
  "critical": true,
  "moderate": false,
  "low": false,

  "allowlist": [
    {
      "id": "GHSA-3gc7-fjrx-p6mg",
      "active": true,
      "reason": "bigint-buffer deep transitive via @solana/wallet-adapter-wallets > @solana/spl-token. Upgrade requires breaking @solana/spl-token bump.",
      "expires": "2026-07-01T00:00:00Z"
    },
    {
      "id": "GHSA-848j-6mx2-7j84",
      "active": true,
      "reason": "elliptic transitive via @solana/wallet-adapter-torus + @walletconnect. Upstream tracking.",
      "expires": "2026-07-01T00:00:00Z"
    }
  ],

  "pass-enoaudit": false,
  "skip-dev": false,
  "report-type": "summary"
}
```

- [ ] **Step 2: Verify the config parses**

Run: `npx audit-ci --config ./audit-ci.jsonc`
Expected: exit 0 with summary "Passed npm security audit." (Assuming Phase 1 was merged first. If not, first merge Phase 1.)

- [ ] **Step 3: Deliberately regress and re-verify**

Temporarily set `"critical": false` → re-run → confirm it still passes. Set it back to `true`. Also temporarily remove the `bigint-buffer` allowlist entry → expect exit 1 with an ID-keyed failure. Restore the entry.

### Task 2.4: Wire `audit-ci` into the workflow

**Files:**
- Modify: `.github/workflows/ci.yml` (lines 35–53)

- [ ] **Step 1: Replace the `security-audit` job**

Replace lines 35–53 with:

```yaml
  security-audit:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4

      - name: Setup Node.js
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run audit-ci
        run: npx audit-ci --config ./audit-ci.jsonc
```

- [ ] **Step 2: Validate the YAML locally**

Run: `npx --yes @action-validator/cli -v .github/workflows/ci.yml`
Expected: no errors. If `@action-validator/cli` is not available, skip; the PR run will validate.

### Task 2.5: Commit and open PR

- [ ] **Step 1: Commit**

```bash
git add audit-ci.jsonc package.json package-lock.json .github/workflows/ci.yml
git commit -m "chore(ci): replace grep-based audit allowlist with audit-ci

Switches the security-audit job from a brittle bash grep allowlist
(four hardcoded package names) to audit-ci with a structured JSONC
config. Each allowlisted advisory now has a reason and an expiry
date so the list re-qualifies quarterly instead of growing silently."
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin chore/ci-audit-ci
gh pr create --title "chore(ci): replace audit grep with audit-ci" --body "$(cat <<'EOF'
## Summary
- Adds \`audit-ci\` devDep + \`audit-ci.jsonc\` with dated allowlist entries
- Replaces the shell grep block in \`.github/workflows/ci.yml\` with \`npx audit-ci\`

## Test plan
- [x] \`npx audit-ci --config ./audit-ci.jsonc\` passes locally
- [x] Deliberately removing an allowlist entry fails locally
- [ ] CI \`security-audit\` job remains green
EOF
)"
```

- [ ] **Step 3: Verify green, merge when approved**

---

## Phase 3: Ephemeral local Supabase in CI

**Why this exists:** Two e2e failures (`admin-config-audit`, `golden_eggs` warnings, implicit staleness elsewhere) trace to migrations being present in the repo but never pushed to the shared hosted CI Supabase project. Every new migration compounds the drift. The `supabase-ci-target-check` gate verifies the URL but cannot verify schema currency. Replacing the shared hosted project with a fresh local Supabase inside each CI job eliminates drift permanently: every run applies every migration from scratch.

### Task 3.1: Create the phase branch

- [ ] **Step 1: Branch off latest main**

```bash
git switch main
git pull --ff-only
git switch -c chore/ci-local-supabase
```

### Task 3.2: Initialize Supabase CLI project config

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Run init**

Run: `supabase init`
Expected: creates `supabase/config.toml` (leaves existing `supabase/migrations/` and `supabase/functions/` untouched).

- [ ] **Step 2: Trim the default config to what CI needs**

Open `supabase/config.toml` and ensure the `[api]`, `[db]`, and `[auth]` sections exist with defaults. Set the following (overwrite defaults where noted):

```toml
project_id = "organic-app-local"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false

[studio]
enabled = false

[inbucket]
enabled = false

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false

[edge_runtime]
enabled = false
```

- [ ] **Step 3: Smoke-test locally (optional but recommended)**

Run: `supabase start`
Expected: output with `API URL: http://127.0.0.1:54321`, `anon key: eyJhbGciOi...`, `service_role key: eyJhbGciOi...`. Record these — they're deterministic per config.toml.

Run: `supabase db reset`
Expected: drops and re-applies every migration in `supabase/migrations/`. If any migration fails, fix it now — this is the most likely blocker in Phase 3.

Run: `supabase stop`.

### Task 3.3: Write the e2e seed file

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Inventory what the current hosted CI project has seeded that fresh migrations do not create**

Run (against the current hosted CI project, requires `SUPABASE_CI_URL` and `SUPABASE_CI_SERVICE_ROLE_KEY` exported locally from 1Password or equivalent):

```bash
supabase db dump \
  --schema public \
  --data-only \
  --db-url "postgres://postgres:[SERVICE_ROLE_PASS]@db.${SUPABASE_CI_PROJECT_REF}.supabase.co:5432/postgres" \
  > /tmp/ci-hosted-seed.sql
```

Inspect `/tmp/ci-hosted-seed.sql`. Identify rows the e2e tests depend on but that are not created by migrations (e.g., default `voting_config` row, default `orgs` row).

- [ ] **Step 2: Write `supabase/seed.sql`**

Example scaffold — replace the rows below with the actual rows identified in Step 1:

```sql
-- seed.sql — applied automatically by `supabase db reset`.
-- This file runs AFTER all migrations. Keep it idempotent (use ON CONFLICT).

-- Default root org used by e2e tests.
insert into public.orgs (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Organic Root', 'root')
on conflict (id) do nothing;

-- Default voting_config row (global, org_id IS NULL).
insert into public.voting_config (org_id, proposer_cooldown_days)
values (null, 7)
on conflict (org_id) do nothing;

-- Add further defaults as identified in Step 1.
```

- [ ] **Step 3: Verify `supabase db reset` applies seed cleanly**

Run: `supabase start && supabase db reset`
Expected: log line `Seeding data from supabase/seed.sql...` and no errors.
Run: `supabase stop`.

### Task 3.4: Build the composite action that starts Supabase

**Files:**
- Create: `.github/actions/setup-supabase/action.yml`

- [ ] **Step 1: Write the composite action**

```yaml
name: Setup local Supabase
description: Boots a local Supabase stack, applies migrations + seed, and exports URL/keys as outputs.
outputs:
  supabase_url:
    description: Local Supabase API URL
    value: ${{ steps.run.outputs.supabase_url }}
  anon_key:
    description: Local Supabase anon key
    value: ${{ steps.run.outputs.anon_key }}
  service_role_key:
    description: Local Supabase service_role key
    value: ${{ steps.run.outputs.service_role_key }}
runs:
  using: composite
  steps:
    - name: Install Supabase CLI
      uses: supabase/setup-cli@v1
      with:
        version: latest

    - name: Start Supabase and capture credentials
      id: run
      shell: bash
      run: |
        set -euo pipefail
        supabase start --exclude studio,inbucket,edge-runtime,realtime,imgproxy > /tmp/supabase-start.log
        cat /tmp/supabase-start.log

        URL=$(grep -E '^\s*API URL:' /tmp/supabase-start.log | awk '{print $NF}')
        ANON=$(grep -E '^\s*anon key:' /tmp/supabase-start.log | awk '{print $NF}')
        SRK=$(grep -E '^\s*service_role key:' /tmp/supabase-start.log | awk '{print $NF}')

        if [ -z "$URL" ] || [ -z "$ANON" ] || [ -z "$SRK" ]; then
          echo "Failed to parse Supabase credentials from start output"
          exit 1
        fi

        echo "supabase_url=$URL" >> "$GITHUB_OUTPUT"
        echo "anon_key=$ANON" >> "$GITHUB_OUTPUT"
        echo "service_role_key=$SRK" >> "$GITHUB_OUTPUT"

        echo "::add-mask::$SRK"

        supabase db reset --no-seed
        if [ -f supabase/seed.sql ]; then
          psql "postgres://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed.sql
        fi
```

- [ ] **Step 2: Verify the action's script works in isolation**

Extract just the bash body into `/tmp/verify.sh`, run it locally with `supabase` on PATH. Expected: prints three non-empty values. If `supabase start` fails on Docker availability, that is a local environment issue — CI has Docker.

### Task 3.5: Update the e2e jobs to use local Supabase

**Files:**
- Modify: `.github/workflows/ci.yml` (the three jobs: `e2e-integrity`, `e2e-operational-controls`, `e2e-full-evidence`, and remove `supabase-ci-target-check`)

- [ ] **Step 1: Delete the `supabase-ci-target-check` job**

Remove lines 79–112 (the entire `supabase-ci-target-check` job definition).

- [ ] **Step 2: Update `needs:` on the e2e jobs**

Change `needs: [lint-and-build, unit-tests, supabase-ci-target-check]` → `needs: [lint-and-build, unit-tests]` for both `e2e-integrity` and `e2e-operational-controls`.

- [ ] **Step 3: Rewrite `e2e-integrity` to boot local Supabase**

Replace the job body with:

```yaml
  e2e-integrity:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    needs: [lint-and-build, unit-tests]

    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4

      - name: Setup Node.js
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start local Supabase
        id: supabase
        uses: ./.github/actions/setup-supabase

      - name: Run integrity E2E gate
        run: |
          npx playwright test \
            tests/proposals-lifecycle.spec.ts \
            tests/voting-integrity.spec.ts \
            tests/proposal-task-flow.spec.ts \
            tests/sprint-phase-engine.spec.ts \
            tests/dispute-sla.spec.ts \
            tests/rewards-settlement-integrity.spec.ts \
            tests/admin-config-audit.spec.ts \
            tests/ui-smoke.spec.ts \
            --workers=1
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ steps.supabase.outputs.supabase_url }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ steps.supabase.outputs.anon_key }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ steps.supabase.outputs.service_role_key }}
          PLAYWRIGHT_BASE_URL: http://localhost:3000
          NEXT_PUBLIC_APP_URL: http://localhost:3000
          NEXT_PUBLIC_SOLANA_RPC_URL: https://api.mainnet-beta.solana.com
          NEXT_PUBLIC_SOLANA_NETWORK: mainnet-beta
          NEXT_PUBLIC_ORG_TOKEN_MINT: DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk

      - name: Upload Playwright report (integrity gate)
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: playwright-report-integrity
          path: playwright-report
          if-no-files-found: ignore
```

Note: `voting-integrity.spec.ts` will still fail on the `total_supply === 12` assertion because it hits live mainnet. Phase 4 fixes that. For Phase 3's PR, temporarily remove `tests/voting-integrity.spec.ts` from the command above AND from `e2e-operational-controls` (Step 4). Put it back in Phase 4.

- [ ] **Step 4: Rewrite `e2e-operational-controls` identically**

Apply the same pattern to the `e2e-operational-controls` job. Same `setup-supabase` action, same env block, same local URLs. Also temporarily drop `tests/voting-integrity.spec.ts` from its `npx playwright test` invocation (keep only `tests/rewards-settlement-integrity.spec.ts`).

- [ ] **Step 5: Update `e2e-full-evidence` similarly**

Same setup action + env block, keeping `continue-on-error: true` and the `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` gate.

### Task 3.6: Remove now-unused repo secrets (documentation only)

**Files:** none — this is a note for the merge PR description.

- [ ] **Step 1: Document secrets-to-retire in the PR body**

In the Phase 3 PR description, list:
> After merge, the following repo secrets can be deleted (no longer referenced):
> - `CI_NEXT_PUBLIC_SUPABASE_URL` (never existed)
> - `CI_NEXT_PUBLIC_SUPABASE_ANON_KEY` (never existed)
> - `CI_SUPABASE_SERVICE_ROLE_KEY` (never existed)
> - `SUPABASE_CI_PROJECT_REF`
> - `SUPABASE_MAIN_PROJECT_REF`
>
> Do not delete them until at least one main-branch push CI run is green with this PR merged.

### Task 3.7: Verify locally before pushing

- [ ] **Step 1: Start local Supabase + seed + apply migrations**

Run: `supabase start && supabase db reset`
Expected: all 92 migrations apply cleanly. If any fails, fix it in a separate commit within this PR — this is a real bug that was hidden by the hosted CI project carrying forward dirty state.

- [ ] **Step 2: Capture the local URL + keys**

Run: `supabase status`
Copy the `API URL`, `anon key`, and `service_role key` values.

- [ ] **Step 3: Run the integrity e2e suite locally**

```bash
NEXT_PUBLIC_SUPABASE_URL=<api_url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key> \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
NEXT_PUBLIC_ORG_TOKEN_MINT=DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk \
npx playwright test \
  tests/proposals-lifecycle.spec.ts \
  tests/proposal-task-flow.spec.ts \
  tests/sprint-phase-engine.spec.ts \
  tests/dispute-sla.spec.ts \
  tests/rewards-settlement-integrity.spec.ts \
  tests/admin-config-audit.spec.ts \
  tests/ui-smoke.spec.ts \
  --workers=1
```

Expected: all listed specs pass. If `admin-config-audit` still fails, the pending migration `20260325100001_token_analytics_config.sql` has a bug — fix it.

- [ ] **Step 4: Stop Supabase**

Run: `supabase stop`.

### Task 3.8: Commit and open PR

- [ ] **Step 1: Commit**

```bash
git add supabase/config.toml supabase/seed.sql .github/actions/setup-supabase/action.yml .github/workflows/ci.yml
git commit -m "chore(ci): boot ephemeral local Supabase per e2e job

Replaces the shared hosted CI Supabase project with a per-job local
Supabase stack (supabase start + db reset). This eliminates schema
drift: every run applies every migration from scratch against a
fresh DB. Drops the supabase-ci-target-check gate (now redundant)
and the five CI_*_SUPABASE_* / SUPABASE_*_PROJECT_REF repo secrets.

Temporarily excludes tests/voting-integrity.spec.ts from e2e-integrity
and e2e-operational-controls — it asserts deterministic token supply
which requires Phase 4's Solana RPC fixture."
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin chore/ci-local-supabase
gh pr create --title "chore(ci): ephemeral local Supabase per e2e job" --body "<see Task 3.6 Step 1 for body contents>"
```

- [ ] **Step 3: Verify all jobs pass on the PR**

Run: `gh pr checks --watch`
Expected: `lint-and-build`, `security-audit`, `unit-tests`, `e2e-integrity`, `e2e-operational-controls` all succeed.

---

## Phase 4: Solana RPC fixture mode

**Why this exists:** `tests/voting-integrity.spec.ts:195` asserts `total_supply === 12` but the `start-voting` route calls `getAllTokenHolders()` against mainnet, returning the real BONK supply of `123,324,836.739604`. The test was written assuming its `snapshot_holders` input was authoritative; security hardening later made on-chain data the source of truth. This phase introduces a small interface around Solana RPC calls so tests can inject a fixture without the API route growing test-only branches.

### Task 4.1: Create the phase branch

- [ ] **Step 1: Branch**

```bash
git switch main
git pull --ff-only
git switch -c refactor/solana-rpc-fixture
```

### Task 4.2: Extract the `SolanaRpc` interface

**Files:**
- Create: `src/lib/solana/rpc.ts`

- [ ] **Step 1: Write the interface**

```typescript
import type { PublicKey } from '@solana/web3.js';

export interface TokenHolder {
  address: string;
  balance: number;
}

export interface SolanaRpc {
  getTokenBalance(walletAddress: string, mintAddress?: PublicKey): Promise<number>;
  getAllTokenHolders(mintAddress?: PublicKey): Promise<TokenHolder[]>;
  isOrgHolder(walletAddress: string): Promise<boolean>;
}
```

### Task 4.3: Move the existing implementation into a "live" module

**Files:**
- Create: `src/lib/solana/rpc-live.ts` (copy-paste body of existing `src/lib/solana.ts`)

- [ ] **Step 1: Move the code**

Copy the current contents of `src/lib/solana.ts` into `src/lib/solana/rpc-live.ts`. Wrap the three async functions (`getTokenBalance`, `getAllTokenHolders`, `isOrgHolder`) in a class that implements `SolanaRpc`:

```typescript
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { SolanaRpc, TokenHolder } from './rpc';

// Keep the existing getConnection + getOrgTokenMint + caches at module scope.
// (Paste unchanged from src/lib/solana.ts lines 4-42.)

export class LiveSolanaRpc implements SolanaRpc {
  async getTokenBalance(walletAddress: string, mintAddress?: PublicKey): Promise<number> {
    // Paste existing getTokenBalance body (lines 50-108 of src/lib/solana.ts).
  }

  async getAllTokenHolders(mintAddress?: PublicKey): Promise<TokenHolder[]> {
    // Paste existing getAllTokenHolders body (lines 122-183).
  }

  async isOrgHolder(walletAddress: string): Promise<boolean> {
    const balance = await this.getTokenBalance(walletAddress);
    return balance > 0;
  }
}
```

Do not delete `src/lib/solana.ts` yet — Step 4.5 re-wires it as a re-export facade.

### Task 4.4: Build the fixture implementation

**Files:**
- Create: `src/lib/solana/rpc-fixture.ts`

- [ ] **Step 1: Write the fixture class**

```typescript
import type { PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import type { SolanaRpc, TokenHolder } from './rpc';

/**
 * Reads fixture holders from the `solana_rpc_fixtures` table.
 * Only used in CI / local dev when SOLANA_RPC_MODE=fixture.
 * The table is created by supabase/seed.sql and does not exist in prod.
 */
export class FixtureSolanaRpc implements SolanaRpc {
  private adminClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  async getAllTokenHolders(_mintAddress?: PublicKey): Promise<TokenHolder[]> {
    const { data, error } = await this.adminClient()
      .from('solana_rpc_fixtures')
      .select('wallet_address, balance');
    if (error) throw new Error(`FixtureSolanaRpc.getAllTokenHolders: ${error.message}`);
    return (data ?? []).map((row) => ({ address: row.wallet_address, balance: Number(row.balance) }));
  }

  async getTokenBalance(walletAddress: string, _mintAddress?: PublicKey): Promise<number> {
    const { data, error } = await this.adminClient()
      .from('solana_rpc_fixtures')
      .select('balance')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (error) throw new Error(`FixtureSolanaRpc.getTokenBalance: ${error.message}`);
    return data ? Number(data.balance) : 0;
  }

  async isOrgHolder(walletAddress: string): Promise<boolean> {
    return (await this.getTokenBalance(walletAddress)) > 0;
  }
}
```

### Task 4.5: Add a factory and convert the existing module into a facade

**Files:**
- Create: `src/lib/solana/index.ts`
- Modify: `src/lib/solana.ts`

- [ ] **Step 1: Write the factory**

`src/lib/solana/index.ts`:

```typescript
import type { SolanaRpc } from './rpc';
import { LiveSolanaRpc } from './rpc-live';
import { FixtureSolanaRpc } from './rpc-fixture';

export type { SolanaRpc, TokenHolder } from './rpc';
export { getConnection, getOrgTokenMint, ORG_TOKEN_MINT } from './rpc-live';

let cached: SolanaRpc | null = null;

export function getSolanaRpc(): SolanaRpc {
  if (cached) return cached;
  cached = process.env.SOLANA_RPC_MODE === 'fixture'
    ? new FixtureSolanaRpc()
    : new LiveSolanaRpc();
  return cached;
}

// Convenience functions preserve the existing public API.
const rpc = () => getSolanaRpc();
export const getTokenBalance = (...args: Parameters<SolanaRpc['getTokenBalance']>) => rpc().getTokenBalance(...args);
export const getAllTokenHolders = (...args: Parameters<SolanaRpc['getAllTokenHolders']>) => rpc().getAllTokenHolders(...args);
export const isOrgHolder = (...args: Parameters<SolanaRpc['isOrgHolder']>) => rpc().isOrgHolder(...args);
```

- [ ] **Step 2: Convert `src/lib/solana.ts` into a re-export shim**

Replace the entire contents of `src/lib/solana.ts` with:

```typescript
export * from './solana/index';
```

This preserves every existing import (`from '@/lib/solana'`) with zero changes to callers.

- [ ] **Step 3: Verify all call sites still compile**

Run: `npm run build`
Expected: success. If any call site breaks, it was importing an internal symbol — move that symbol into `src/lib/solana/index.ts` and re-export.

### Task 4.6: Add the fixture table via seed

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append the fixture table**

Append to `supabase/seed.sql`:

```sql
-- Solana RPC fixture table — only exists in CI / local dev.
-- Tests write rows here before hitting APIs that read on-chain data.
-- FixtureSolanaRpc (gated by SOLANA_RPC_MODE=fixture) reads from it.
create table if not exists public.solana_rpc_fixtures (
  wallet_address text primary key,
  balance numeric not null check (balance >= 0),
  created_at timestamptz not null default now()
);

-- RLS: service_role only. Intentionally no public SELECT.
alter table public.solana_rpc_fixtures enable row level security;
```

Production DBs never run `seed.sql`, so this table stays local/CI-only.

### Task 4.7: Wire `SOLANA_RPC_MODE=fixture` into the CI e2e jobs

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the env var to every e2e job**

For `e2e-integrity`, `e2e-operational-controls`, and `e2e-full-evidence`, add to the `env:` block under the Playwright step:

```yaml
          SOLANA_RPC_MODE: fixture
```

- [ ] **Step 2: Un-exclude `tests/voting-integrity.spec.ts`**

Revert the temporary exclusion from Phase 3 Task 3.5 Steps 3 + 4. The spec file goes back into both `e2e-integrity` and `e2e-operational-controls`.

### Task 4.8: Update `voting-integrity.spec.ts` to seed the fixture

**Files:**
- Modify: `tests/voting-integrity.spec.ts`

- [ ] **Step 1: Seed rows in `beforeAll`**

After the `walletB` wallet-pubkey update block (around line 122), add:

```typescript
    // Seed fixture holders so the start-voting route returns deterministic
    // total_supply. Requires SOLANA_RPC_MODE=fixture in the API runtime.
    await supabaseAdmin
      .from('solana_rpc_fixtures')
      .upsert([
        { wallet_address: walletA, balance: 10 },
        { wallet_address: walletB, balance: 2 },
      ], { onConflict: 'wallet_address' });
```

- [ ] **Step 2: Clean up in `afterAll`**

Inside the existing `afterAll`, before deleting users, add:

```typescript
    await supabaseAdmin
      .from('solana_rpc_fixtures')
      .delete()
      .in('wallet_address', [walletA, walletB]);
```

- [ ] **Step 3: Verify the existing assertion now holds**

The assertion at line 195 (`expect(Number(started?.snapshot?.total_supply ?? 0)).toBe(12)`) now holds because `FixtureSolanaRpc.getAllTokenHolders()` returns the two seeded rows summing to 12. No change needed to the assertion itself.

### Task 4.9: Add a unit test for the factory

**Files:**
- Create: `src/lib/solana/__tests__/rpc-factory.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('getSolanaRpc factory', () => {
  const originalMode = process.env.SOLANA_RPC_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.SOLANA_RPC_MODE;
    } else {
      process.env.SOLANA_RPC_MODE = originalMode;
    }
    vi.resetModules();
  });

  it('returns FixtureSolanaRpc when SOLANA_RPC_MODE=fixture', async () => {
    process.env.SOLANA_RPC_MODE = 'fixture';
    vi.resetModules();
    const { getSolanaRpc } = await import('../index');
    const { FixtureSolanaRpc } = await import('../rpc-fixture');
    expect(getSolanaRpc()).toBeInstanceOf(FixtureSolanaRpc);
  });

  it('returns LiveSolanaRpc when SOLANA_RPC_MODE is unset', async () => {
    delete process.env.SOLANA_RPC_MODE;
    vi.resetModules();
    const { getSolanaRpc } = await import('../index');
    const { LiveSolanaRpc } = await import('../rpc-live');
    expect(getSolanaRpc()).toBeInstanceOf(LiveSolanaRpc);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/lib/solana/__tests__/rpc-factory.test.ts`
Expected: both tests pass.

### Task 4.10: Verify the full e2e suite locally

- [ ] **Step 1: Reboot local Supabase with the new seed**

```bash
supabase start
supabase db reset
```

Expected: `solana_rpc_fixtures` table created by the updated `seed.sql`.

- [ ] **Step 2: Run the voting-integrity spec with fixture mode**

```bash
NEXT_PUBLIC_SUPABASE_URL=<api_url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key> \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
SOLANA_RPC_MODE=fixture \
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
NEXT_PUBLIC_ORG_TOKEN_MINT=DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk \
npx playwright test tests/voting-integrity.spec.ts --workers=1
```

Expected: all four tests in the file pass. The `total_supply` assertion at line 195 now resolves to 12.

- [ ] **Step 3: Run the full integrity + operational-controls set**

Same command as Phase 3 Task 3.7 Step 3, but include `tests/voting-integrity.spec.ts` and set `SOLANA_RPC_MODE=fixture`.
Expected: all listed specs pass.

- [ ] **Step 4: Stop Supabase**

`supabase stop`.

### Task 4.11: Commit and open PR

- [ ] **Step 1: Commit**

```bash
git add src/lib/solana src/lib/solana.ts supabase/seed.sql .github/workflows/ci.yml tests/voting-integrity.spec.ts
git commit -m "refactor(solana): extract RPC interface with fixture mode

Splits src/lib/solana.ts into a SolanaRpc interface + LiveSolanaRpc
(unchanged mainnet impl) + FixtureSolanaRpc (reads from the
solana_rpc_fixtures table, CI-only). getSolanaRpc() returns the
fixture when SOLANA_RPC_MODE=fixture is set.

voting-integrity.spec.ts now seeds two fixture holders in beforeAll
so the start-voting route returns a deterministic total_supply of 12.
Removes dependency on live mainnet BONK supply in CI tests.

src/lib/solana.ts is retained as a re-export facade — no caller
import paths change."
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin refactor/solana-rpc-fixture
gh pr create --title "refactor(solana): RPC fixture mode for deterministic e2e" --body "$(cat <<'EOF'
## Summary
- Extracts \`SolanaRpc\` interface; moves existing impl to \`LiveSolanaRpc\`
- Adds \`FixtureSolanaRpc\` reading from \`solana_rpc_fixtures\` (seed-only table)
- \`SOLANA_RPC_MODE=fixture\` env var selects the fixture in CI
- \`voting-integrity.spec.ts\` seeds two holders, asserts total_supply=12

## Test plan
- [x] Unit test for factory selection
- [x] Local \`voting-integrity.spec.ts\` passes with fixture mode
- [x] Full e2e integrity suite passes locally
- [ ] CI green on PR
EOF
)"
```

- [ ] **Step 3: Verify green, merge when approved**

---

## Post-merge cleanup

After all four phases are merged to main and at least one main-branch push CI run is green:

- [ ] Delete the retired repo secrets (list in Task 3.6 Step 1).
- [ ] In the Supabase dashboard, pause or delete the CI project (referenced by the now-retired `SUPABASE_CI_PROJECT_REF`). Confirm nothing else depends on it first (`gh api repos/:owner/:repo/actions/variables` + grep other workflows).
- [ ] Delete all four phase branches locally and on origin.

## Acceptance criteria

- [ ] Every PR run of `.github/workflows/ci.yml` passes all of `lint-and-build`, `security-audit`, `unit-tests`, `e2e-integrity`, `e2e-operational-controls` with no force-merges.
- [ ] `e2e-full-evidence` runs (non-blocking) on pushes to `main`.
- [ ] `supabase-ci-target-check` no longer exists.
- [ ] `npx audit-ci --config ./audit-ci.jsonc` passes on every PR.
- [ ] `voting-integrity.spec.ts` passes against a local Supabase with `SOLANA_RPC_MODE=fixture` and does not depend on mainnet RPC data.
