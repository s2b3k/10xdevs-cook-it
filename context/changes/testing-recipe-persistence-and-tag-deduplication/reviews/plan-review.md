<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Recipe Persistence and Tag Deduplication

- **Plan**: context/changes/testing-recipe-persistence-and-tag-deduplication/plan.md
- **Mode**: Deep
- **Date**: 2026-09-13
- **Verdict**: SOUND
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | PASS |

## Grounding

Grounding: 7/7 paths verified, 5/5 symbols verified, brief↔plan consistent. No contract-surfaces.md or lessons.md file is present.

## Findings

### F1 — Playwright success claim is not reproducible

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — Automated Verification and Progress rows 3.1–3.5
- **Detail**: The plan records the browser suite as `3 passed`, but a fresh run on 2026-09-13 passes 2 tests and times out while waiting for the taxonomy POST in `tests/recipe-mutation-api.spec.ts`. The test setup now waits for a `201` response after pressing Enter, but the response does not arrive, so the partial-assignment contract is not currently proven. Earlier failures also showed stale Playwright auth and a race between taxonomy creation and form submission. The plan's success criteria therefore overstate the current evidence.
- **Fix**: Make taxonomy selection deterministic in the test by waiting for the actual create/select UI state or the route response that the component can reliably produce, then rerun the complete focused suite and update the Progress evidence only after all 3 tests pass. Document the required authenticated HTTP Supabase setup separately from Docker/local Supabase.
- **Decision**: FIXED — plan now requires a fresh 3/3 Playwright run with deterministic taxonomy-selection synchronization and reopens the dependent progress rows.

### F2 — Environment prerequisite is narrower than the working setup

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Plan Brief prerequisites; Phase 2 and Phase 3 success criteria
- **Detail**: The plan requires local Supabase running and describes the Playwright suite as running against configured local credentials, but the verified workflow uses an HTTP Supabase project and a refreshed `auth.json`; Docker/Supabase CLI is unavailable in the current Windows environment. This makes the plan harder to reproduce and was directly involved in the stale-refresh-token failures.
- **Fix**: Replace the prerequisite wording with provider-agnostic configured Supabase HTTP credentials, explicitly list `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and require `auth.json` to be generated against the same project.
- **Decision**: FIXED — prerequisites now support the configured HTTP Supabase project or local Docker equivalent and require auth.json to target the same project.

### F3 — Duplicate relation conflict lacks browser/API regression coverage

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 typed assignment errors; Phase 3 negative API matrix
- **Detail**: The route unit test maps duplicate relation errors to HTTP 409, but `tests/recipe-mutation-api.spec.ts` does not exercise the public authenticated endpoint for that contract. This is not a plan blocker because route-level coverage exists, but adding one request would make the stated public HTTP error contract more complete.
- **Fix**: Add an authenticated duplicate-assignment request that asserts 409 and leaves the relation count at one.
- **Decision**: FIXED — Phase 3 now includes an authenticated duplicate-assignment regression asserting 409 and one persisted relation.
