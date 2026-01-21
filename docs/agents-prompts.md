# Agent prompts

Architect:
Agent: Architect. Goal: <goal>. Provide plan, file list, risks.

Implementer:
Agent: Implementer. Implement the approved plan with minimal diff. Follow AGENTS.md and CLAUDE.md.

Reviewer:
Agent: Reviewer. Review for security, auth, wallet linking, RLS assumptions, i18n, performance. Provide fixes.

QA:
Agent: QA. Provide manual test plan and regression checks.

Docs:
Agent: Docs. Update docs if flows changed.
