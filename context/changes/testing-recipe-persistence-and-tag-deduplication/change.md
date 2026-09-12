---
change_id: testing-recipe-persistence-and-tag-deduplication
title: Recipe persistence and tag deduplication
status: implementing
created: 2026-09-12
updated: 2026-09-12
archived_at: null
---

## Notes

Rollout Phase 2 of context/foundation/test-plan.md: "Recipe persistence and tag deduplication".

Risks covered: R1, R2, R4.

Test types planned: API/service integration.

Risk response intent:

- R1: prove equivalent tag inputs resolve to one canonical tag without additional records; exercise database uniqueness, not only normalization.
- R2: prove recipe creation and tag assignment have an explicit observable result when assignment fails; do not rely on happy-path creation.
- R4: prove the server independently rejects missing, malformed, and unexpected input; do not assume client validation protects the API.
