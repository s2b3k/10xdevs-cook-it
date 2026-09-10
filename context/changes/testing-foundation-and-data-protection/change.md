---
change_id: testing-foundation-and-data-protection
title: Test foundation and data protection
status: implementing
created: 2026-09-10
updated: 2026-09-10
archived_at: null
---

## Notes

Rollout Phase 1 of context/foundation/test-plan.md.

Risks covered: R3, R5.
Test types planned: Integration with Supabase/RLS.

Risk response intent:
- R3: prove that account A cannot read or modify account B's recipe data or relations; challenge the assumption that being logged in is sufficient authorization.
- R5: prove that edge-case recipe-taxonomy operations preserve referential and uniqueness guarantees; avoid asserting only that a row exists.
