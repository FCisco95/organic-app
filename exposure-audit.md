# GitHub Exposure Audit

Date: 2026-02-09
Repo: organic-app
Scope: file list + sizes, respecting .gitignore

## Snapshot Output
- workspace-snapshot.tsv (paths + sizes)

## High-Risk / Keep Private
These should not be committed or exposed publicly.
- `.env.local`
  - Local secrets and API keys. Currently ignored by `.gitignore`.
- `.envrc`
  - Shell env config. Currently ignored by `.gitignore`.
- `.mcp.json`
  - Contains tokens. Currently ignored by `.gitignore`.

## Potentially Sensitive / Policy Decision
These are repo-specific, but often kept private or internal.
- `agents/` and `.agents/`
  - `agents/claude.md` and `.agents/` were removed from git tracking and added to `.gitignore`.
  - If you want them in the repo, remove the ignore rules and re-add intentionally.

## Documentation References (OK to keep public)
These are placeholders or references, not actual secrets.
- `.env.local.example`
- `SETUP_GUIDE.md`

## Recommended Actions (No changes made)
1. Decide whether `agents/` is meant to be public documentation or internal-only.
2. If `agents/` or `.agents/` should be private, add them to `.gitignore` and remove from git tracking.
3. Continue to keep `.env.local`, `.envrc`, and `.mcp.json` ignored.
