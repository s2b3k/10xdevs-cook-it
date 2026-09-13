<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Testing Quality Gates and CI Enforcement

- **Plan**: context/changes/testing-quality-gates/plan.md
- **Scope**: Phases 1-2 of 2
- **Date**: 2026-09-13
- **Verdict**: APPROVED
- **Findings**: 1 critical, 2 warnings, 1 observation

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

### F1 — Post-edit hook is still invalid JSON

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence / Success Criteria
- **Location**: .github/hooks/quality-gates.json:1
- **Detail**: The file is entirely commented out, so JSON parsing fails and the PostToolUse hook cannot run. This contradicts Phase 1 contract and Progress item 1.1.
- **Fix**: Replace the commented pseudo-JSON with the active hook object, then validate it with the plan's JSON parse command.
- **Decision**: FIXED — activated the hook JSON and verified parsing successfully.

### F2 — Playwright runs in two workflows

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: .github/workflows/ci.yml:26
- **Detail**: Both ci.yml and playwright.yml trigger on pushes and pull requests to master and run the same Playwright suite. This doubles CI execution and leaves Node versions inconsistent (`22` versus `lts/*`).
- **Fix**: Consolidate Playwright execution into ci.yml by removing the duplicate workflow, or intentionally keep both and document the reason while aligning the Node version.
- **Decision**: FIXED — removed the duplicate standalone Playwright workflow; ci.yml remains the single Playwright path.

### F3 — CI secret requirement is incomplete in repository guidance

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: AGENTS.md:51
- **Detail**: CI now supplies SUPABASE_SERVICE_ROLE_KEY for Vitest and Playwright cleanup, but AGENTS.md and CLAUDE.md document only SUPABASE_URL and SUPABASE_KEY. This can cause maintainers to configure incomplete CI secrets.
- **Fix**: Document SUPABASE_SERVICE_ROLE_KEY wherever CI repository secrets are described.
- **Decision**: FIXED — documented SUPABASE_SERVICE_ROLE_KEY in AGENTS.md and CLAUDE.md.

### F4 — Phase 4 cookbook entry remains TBD

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/foundation/test-plan.md:92
- **Detail**: The rollout table marks Phase 4 complete, but the cookbook still says “Running critical tests with lint and build: TBD”. This is inconsistent completion guidance, although it is outside the explicit Phase 2 file contract.
- **Fix**: Replace the TBD entry with the actual local and CI commands and required environment variables.
- **Decision**: FIXED — replaced the TBD cookbook entry with the current local commands, CI workflow, and required secrets.

## Verification Notes

- Hook JSON parsing passed after F1 was fixed.
- `npm run lint -- --quiet` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run test:run` passed with 26 tests. One earlier run encountered a transient remote Supabase `JWT issued at future` response; the isolated test retry and subsequent full suite both passed without code changes.
