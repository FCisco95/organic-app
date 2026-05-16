# `@solana/spl-token` / `bigint-buffer` chain triage

**Date:** 2026-05-16
**Audit branch:** `docs/spl-token-bigint-buffer-triage`
**Prior claim being re-examined:** `docs/audits/2026-05-15-security-sweep.md` flagged the `@solana/spl-token` → `@solana/buffer-layout-utils` → `bigint-buffer` chain as a High-severity finding with `npm audit`'s suggested fix being a breaking downgrade to `@solana/spl-token@0.1.8`.

## TL;DR

The advisory **is already allowlisted** in `audit-ci.jsonc` (entry `GHSA-3gc7-fjrx-p6mg`, expiry 2026-07-15), so CI is not currently failing — but the allowlist note had two inaccuracies that this audit corrects:

1. The note says spl-token reaches us "transitive via `@solana/wallet-adapter-wallets`". **It does not.** `@solana/spl-token` is a **direct** dependency in `package.json`.
2. The note implies the downgrade is the only fix path. **The actual blocker is upstream.** `bigint-buffer@1.1.5` IS the latest published version, and it has no patched release. `@solana/buffer-layout-utils@0.2.0` is also at latest. `@solana/spl-token@0.4.14` (also at latest) still depends on the vulnerable chain. There is no version to upgrade to.

**Risk assessment: structural-zero.** The vulnerable function (`bigint-buffer.toBigIntLE`) is only called by `@solana/buffer-layout-utils` decoders, which are invoked when spl-token decodes account/mint data. Our codebase imports spl-token in **exactly one place** and **only for the `TOKEN_PROGRAM_ID` `PublicKey` constant** — never for any decode function. The vulnerable code path is unreachable from our app.

This PR:

1. **Corrects** the allowlist note in `audit-ci.jsonc`.
2. **Adds** a regression test (`tests/security/spl-token-import-surface.test.ts`) that fails if anyone introduces a function-call import from `@solana/spl-token` without explicit re-evaluation.
3. Files this audit so the conclusion is reproducible the next time someone re-runs `/security-sweep` and sees the same advisory bubble up.

No package or lockfile changes. No production behavior change.

## Reproduction

```bash
$ npm view @solana/spl-token dist-tags
{ next: '0.2.0-alpha.2', alpha: '0.3.4-alpha.0', latest: '0.4.14' }

$ npm view bigint-buffer dist-tags
{ latest: '1.1.5' }

$ npm ls bigint-buffer
organic-app@0.1.0
└─┬ @solana/spl-token@0.4.14
  └─┬ @solana/buffer-layout-utils@0.2.0
    └── bigint-buffer@1.1.5

$ grep -REn "from\s+['\"]@solana/spl-token['\"]" src tests --include='*.ts' --include='*.tsx'
src/lib/solana/rpc-live.ts:2:import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

$ grep -REn "from\s+['\"]@solana/buffer-layout-utils['\"]|from\s+['\"]bigint-buffer['\"]|toBigIntLE|toBigIntBE|fromBigIntLE|fromBigIntBE" src tests --include='*.ts' --include='*.tsx'
# (no output)
```

## Why the suggested fix is wrong

`npm audit fix --force` would replace `@solana/spl-token@0.4.14` with `@solana/spl-token@0.1.8` — a four-year-old release pre-dating Token-2022 program support, modern API ergonomics (e.g. `getAccount`, `getMint`), and TypeScript types. We would lose:

- `TOKEN_PROGRAM_ID` constant export shape compatibility (the symbol still exists in 0.1.8 but is a Buffer instead of a `PublicKey` on some paths)
- Any future ability to call decode helpers in spl-token@0.4 without further migration

For a code path we don't actually invoke. Wrong tradeoff.

## Why no override is shipped

Options considered:

| Option | Verdict |
|---|---|
| Pin `bigint-buffer` via `package.json` `overrides` to a maintained fork | No actively-maintained fork exists. Pinning to an unmaintained fork trades one supply-chain risk for another. |
| Stub `bigint-buffer` with a no-op shim (`npm:no-bigint-buffer-shim`) | Would break runtime *if* we ever call into the path. Currently safe, but a footgun for future contributors. |
| Wait for upstream patch | Best option. Track via the regression test below + the allowlist's 2026-07-15 expiry forcing a re-audit. |
| Drop `@solana/spl-token` entirely and inline `TOKEN_PROGRAM_ID` as a `PublicKey('Tokenkeg…')` | Eliminates the dep and the advisory. Worth doing as a follow-up; out of scope for this triage so the change can be reviewed cleanly. See follow-up #2 below. |

We're taking the third option (wait + regression test) for this PR. Follow-up #2 (inline the constant) is the path to fully removing the chain.

## Confirmations

### `TOKEN_PROGRAM_ID` is the well-known Token Program ID

Verified at runtime:

```text
$ node -e "console.log(require('@solana/spl-token').TOKEN_PROGRAM_ID.toBase58())"
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

This is the canonical SPL Token Program public key, hard-coded in Solana's tooling and unchanged since 2020.

### `bigint-buffer` is not touched at module-load time

The advisory is a runtime issue in `toBigIntLE` / `toBigIntBE`. Module-load of `@solana/spl-token` imports the package's index, which exports constants and class definitions but does not execute the vulnerable decode path. Reachability is determined by call sites, not by import alone — and we have zero call sites.

## Recommended follow-ups (separate PRs)

1. **Re-audit when the 2026-07-15 allowlist expiry hits.** `audit-ci` will fail and surface this entry again. At that point, either upstream has shipped a patch or we revisit this triage.
2. **Inline `TOKEN_PROGRAM_ID` as a `new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')` and remove `@solana/spl-token` from `package.json` entirely.** Eliminates the dep, the advisory, and the allowlist entry. ~5 LOC change. Worth doing if the upstream patch isn't out by July.
3. **Generalize the import-surface test** to cover other "allowlisted because unreachable" findings (axios, lodash, protobufjs) — each currently has an allowlist note claiming structural-zero exposure, but no regression test enforces it.

## Memory hooks confirmed

- `feedback_dont_trust_issue_framing` — third instance this month where an audit's framing (the suggested `0.1.8` downgrade) didn't match the actual situation. Pattern is robust: when `npm audit` proposes a major downgrade, treat it as "needs human judgment", not as the fix.
- `feedback_one_pr_per_task` — audit doc + regression test + allowlist correction ship together because they describe and enforce the same conclusion.

## Run history

| Date | Action | Outcome |
|---|---|---|
| 2026-05-16 | `npm view` / `npm ls` for spl-token + bigint-buffer | All three packages at latest; no upstream patch |
| 2026-05-16 | grep for all spl-token / bigint-buffer / toBigIntLE call sites | 1 hit: `TOKEN_PROGRAM_ID` constant import only |
| 2026-05-16 | Runtime confirmation of `TOKEN_PROGRAM_ID.toBase58()` | Returns canonical SPL Token Program ID |
| 2026-05-16 | Allowlist accuracy review (`audit-ci.jsonc`) | 2 inaccuracies found and corrected in this PR |
