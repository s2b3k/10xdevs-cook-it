<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Search recipes autocomplete and details S-02

- **Plan**: context/changes/search-recipes-autocomplete-and-details/plan.md
- **Scope**: Phases 1-3 of 3
- **Date**: 2026-09-12
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — E2E fixtures are not cleaned up

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: tests/search-recipes.spec.ts:39
- **Detail**: The E2E scenario creates two taxonomies, three recipes, and four relations through the authenticated API, but never deletes them. Unique timestamp names prevent collisions, yet repeated runs permanently pollute the authenticated account and can affect list rendering, manual verification, and representative search timing. The repository's E2E rules require each test to own cleanup.
- **Fix**: Add a `finally` cleanup path using authenticated DELETE endpoints or a privileged fixture cleanup mechanism, while preserving the unique fixture names.
  - Strength: Keeps browser tests independent and prevents test data from influencing later runs.
  - Tradeoff: Requires adding or reusing cleanup API calls and slightly lengthens the scenario.
  - Confidence: HIGH — the current fixture creation is observable and has no teardown.
  - Blind spot: The existing seed test also leaves data behind, so cleanup conventions may need a broader follow-up.
- **Decision**: FIXED — added Supabase service-role cleanup in `finally`; focused typecheck, lint, and Chromium tests pass.

### F2 — API service-failure mapping is not independently covered

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: tests/search-recipes.spec.ts:51
- **Detail**: Phase 1 and Phase 3 require API/route verification for unexpected service failure mapping. The implemented browser assertions cover repeated taxonomy parameters, valid empty results, invalid UUID/limit input, and unauthenticated 401, but there is no route-level test that forces a service failure and asserts the 500 response shape. The current route catch block exists, but this contract is unprotected.
- **Fix**: Add a focused route test with mocked `createRecipeService` or a controlled Supabase failure and assert HTTP 500 plus the stable error payload.
  - Strength: Directly covers the explicit plan criterion without changing production behavior.
  - Tradeoff: Requires a route-test harness or a small dependency-injection seam.
  - Confidence: HIGH — repository search found no service-failure API test.
  - Blind spot: The project currently favors integration tests, so the lightest maintainable mocking boundary should be chosen.
- **Decision**: FIXED — added mocked API route failure coverage and enabled API integration test discovery in Vitest; focused and full suites pass with 14 tests.

### F3 — Detail route UUID validation is syntactic but not structural

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/recipes/[id].astro:17
- **Detail**: The route uses `/^[0-9a-f-]{36}$/i`, which accepts malformed UUID strings with misplaced or excessive hyphens. Those values can reach the database query and may produce an infrastructure-style error state instead of the intended controlled not-found state. This does not permit cross-account access, but it is weaker than the plan's UUID validation contract.
- **Fix**: Reuse a strict UUID schema/parser at the route boundary and treat parse failures as not found.
- **Decision**: FIXED — strict UUID parsing now maps malformed route IDs to the controlled not-found state; typecheck, targeted lint, and build pass.

## Verification

- `npx astro sync` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with existing astro-eslint-parser warnings.
- `npm run test:run` passed: 14 tests.
- `npm run build` passed.
- `npx playwright test tests/search-recipes.spec.ts --project=chromium --workers=1` passed: 2 tests.
- All Phase 1-3 manual verification rows are marked complete in the plan.
- Representative timing previously measured p95 at 1091.31 ms against the 1.5 second target, with one 5099.93 ms outlier.
