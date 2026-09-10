<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Test Foundation and Data Protection

- **Plan**: `context/changes/testing-foundation-and-data-protection/plan.md`
- **Scope**: Phases 1-4 of 4
- **Date**: 2026-09-10
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
| --- | --- |
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Verification

- `npm run test:run`: PASS, 8 tests across 2 integration files.
- `npm run lint`: PASS, with existing `astro-eslint-parser` projectService warnings.
- `npm run build`: PASS, with existing sitemap and CSS warnings.
- `npx astro sync`: PASS.
- Manual Progress items: all marked complete; the review relies on the recorded manual confirmations for local Supabase setup, RLS mutation detection, cleanup, integration-only scope, and clean-checkout setup.

## Findings

### F1 — Cleanup failures are silently ignored

- **Severity**: WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/services/__tests__/helpers.ts:214-243`
- **Detail**: `cleanup()` awaits deletes for relations, recipes, taxonomies, and users but never checks returned Supabase errors. A failed cleanup can leave fixtures behind while the test run still appears successful, undermining the plan's explicit cleanup guarantee and the manual no-leftovers check.
- **Fix**: Check every cleanup result, collect failures, and throw a summary after attempting all cleanup operations so resource leaks fail the suite visibly.
  - **Strength**: Preserves cleanup attempts while making pollution actionable.
  - **Tradeoff**: Cleanup failures will fail tests that otherwise passed.
  - **Confidence**: HIGH — directly addresses the ignored external-boundary errors.
  - **Blind spot**: The exact desired cleanup retry policy is not specified.
- **Decision**: FIXED — cleanup now checks all deletion errors, attempts every cleanup operation, and throws a summary.

### F2 — Service-role cleanup boundary is implicit

- **Severity**: WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/services/__tests__/helpers.ts:156-160`
- **Detail**: The helper requires `SUPABASE_SERVICE_ROLE_KEY` and exposes an `admin` client for cleanup, while the plan requires service-role credentials to stay out of authorization assertions. The tests follow that rule, but the helper itself does not document that `admin` is cleanup-only, making accidental bypass easier for future tests.
- **Fix**: Add a concise TSDoc/comment at `createTestContext()` and the cleanup function stating that `admin` is privileged cleanup-only and all R3 assertions must use authenticated user clients.
  - **Strength**: Makes the security boundary visible at the point of use without changing runtime behavior.
  - **Tradeoff**: Documentation only; it cannot technically prevent misuse.
  - **Confidence**: HIGH — matches the plan's critical implementation detail.
  - **Blind spot**: A stronger type-level separation would require a larger helper redesign.
- **Decision**: FIXED — comments now document that the privileged client is reserved for cleanup and final-state inspection, while authorization assertions use user clients.

### F3 — Formatting commit expanded beyond the plan

- **Severity**: WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `df97762` and repository-wide formatting diff
- **Detail**: The implementation plan names the test/config/helper/documentation files, but the final formatting commit changed 39 tracked files across `.github`, `context`, application code, and configuration. The changes are formatting-only and the quality gates pass, but they increase review and rollback scope and include files unrelated to the test foundation.
- **Fix**: Keep this commit separate from feature work and document it as an intentional repository-wide formatting/ignore change, or split future formatting changes into focused area-specific commits.
  - **Strength**: Preserves the already-created commit while making the scope boundary explicit.
  - **Tradeoff**: The broad commit remains in history and may complicate selective reverts.
  - **Confidence**: HIGH — the commit history and changed-file list provide direct evidence.
  - **Blind spot**: Some formatting changes may have been pre-existing work intentionally consolidated by the user.
- **Decision**: SKIPPED — the broad formatting scope was intentional and accepted for this repository cleanup.

### F4 — Plan wording overstates missing-reference mapping

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `context/changes/testing-foundation-and-data-protection/plan.md:147`
- **Detail**: The Phase 3 success criterion says missing recipe and taxonomy references map to integrity errors. The implemented and tested behavior is more precise: a missing recipe is blocked by the relation RLS `EXISTS` predicate and maps to `RECIPE_UNAUTHORIZED`, while a missing taxonomy reaches the foreign key and maps to `RECIPE_INTEGRITY`. The research and test name document this nuance, but the plan criterion remains simplified.
- **Fix**: Update the completed criterion text to distinguish the RLS-blocked missing recipe from the missing-taxonomy integrity error.
- **Decision**: FIXED — Progress 3.2 now distinguishes the RLS-blocked missing recipe from the missing-taxonomy integrity error.

## Positive Findings

- Vitest discovery is scoped to integration tests and uses the Node environment.
- R3 assertions use authenticated clients; the service-role client is used for cleanup and final-state inspection only.
- Fixtures use unique UUID-based names and tests run sequentially.
- R3 and R5 tests assert both domain errors and final database state.
- The suite fails clearly when required Supabase environment variables are absent.

## Review Conclusion

The implementation is fundamentally sound and all automated criteria pass, but it should receive attention for cleanup observability and explicit privilege-boundary documentation before this test foundation is treated as a durable pattern for later rollout phases.
