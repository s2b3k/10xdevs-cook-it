<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Add Recipe with Taxonomy (S-01)

- **Plan**: context/changes/add-recipe-with-taxonomy/plan.md
- **Scope**: Full plan review (completed Phase 1-3)
- **Date**: 2026-05-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 1 observation

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Findings

### F1 — POST /api/taxonomy always returns 200

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/taxonomy/index.ts:78
- **Detail**: Plan contract in Phase 1 states 201 when taxonomy is newly created and 200 when it already exists. Current implementation always returns 200, so HTTP semantics drift from planned contract.
- **Fix**: Return creation metadata from taxonomy service (e.g. `isNew`) and set response status to 201 for new records and 200 for existing records.
- **Decision**: FIXED

### F2 — Tag assignment failure blocks success redirect

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/recipes/AddRecipeForm.tsx:89
- **Detail**: After successful recipe creation, tag assignment runs sequentially. Any failed assignment throws and surfaces a full error banner, preventing redirect to /recipes. Plan states partial tag assignment failures should not block overall recipe success and should be presented as warning.
- **Fix A ⭐ Recommended**: Keep recipe success path and collect per-tag assignment failures as non-blocking warnings before redirect.
  - Strength: Matches explicit plan behavior and preserves user trust that recipe was saved.
  - Tradeoff: Requires warning UX and minor state plumbing.
  - Confidence: HIGH — directly grounded in Phase 1 critical implementation note.
  - Blind spot: Warning persistence after redirect not yet designed.
- **Fix B**: Enforce all-or-nothing by failing the whole submission if any assignment fails.
  - Strength: Simpler consistency model from user perspective.
  - Tradeoff: Violates current plan and may require transaction-oriented backend redesign.
  - Confidence: MEDIUM — technically straightforward but contract-breaking.
  - Blind spot: No transaction support currently in this client-driven flow.
- **Decision**: FIXED (via Fix A)

### F3 — photoUrl schema does not validate URL format

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/schemas/recipe.schemas.ts:8
- **Detail**: Plan contract requires photoUrl to be optional URL string or null. Current schema accepts any string and relies on later normalization, so invalid URLs pass API validation.
- **Fix**: Change schema to URL-aware validation (`z.string().url().nullable().optional()`) with current null/optional behavior preserved.
- **Decision**: SKIPPED

### F4 — Unrelated commit appears in date-based git window

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: N/A (commit 8951925)
- **Detail**: Date-scoped git log includes a non-S-01 commit (`get m2l3 package`). S-01-specific commit scope is still clean, but date-window reviews can pick up unrelated work and create review noise.
- **Fix**: Keep current scoped-by-change-id commit filtering for this review; optionally include a small note in future reviews when date-window contains unrelated commits.
- **Decision**: SKIPPED
