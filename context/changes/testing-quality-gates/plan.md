# Testing Quality Gates and CI Enforcement Implementation Plan

## Overview

Establish complete, enforceable quality gates across local agent workflows, git hooks, and GitHub Actions CI pipelines. This completes Phase 4 of [context/foundation/test-plan.md](context/foundation/test-plan.md), ensuring that Vitest integration tests and Playwright E2E tests run automatically on CI, per-edit post-tool-use agent hooks format code mid-session, and repo guidelines reflect testing requirements.

## Current State Analysis

- **Local Hooks**: [.husky/pre-commit](.husky/pre-commit) runs `lint-staged` and `npm run typecheck`. [.github/hooks/quality-gates.json](.github/hooks/quality-gates.json) is disabled (commented-out JSON template).
- **CI Workflows**: [.github/workflows/ci.yml](.github/workflows/ci.yml) runs `npm run lint` and `npm run build`, but omits `npm run test:run` (Vitest integration tests). [.github/workflows/playwright.yml](.github/workflows/playwright.yml) runs Playwright but lacks `SUPABASE_SERVICE_ROLE_KEY` secret required for test fixture cleanup.
- **Documentation**: [AGENTS.md](AGENTS.md#L36) states "No dedicated unit test runner is configured yet", which is outdated after Phase 1-3.

## Desired End State

A unified 3-layer quality gate system:
1. **Per-Edit Agent Hook**: [.github/hooks/quality-gates.json](.github/hooks/quality-gates.json) active with `PostToolUse` trigger (`Write|Edit` → `npm run lint:fix -- --quiet`).
2. **Developer Pre-Commit Hook**: [.husky/pre-commit](.husky/pre-commit) enforces formatting (`lint-staged`) and type checking (`npm run typecheck`).
3. **CI Pipeline**: [.github/workflows/ci.yml](.github/workflows/ci.yml) executes linting, typecheck sync, Vitest integration tests (`npm run test:run`), production build, and Playwright E2E tests (`npx playwright test`) with required Supabase secrets.

## Key Discoveries

- [.github/hooks/quality-gates.json:1-10](.github/hooks/quality-gates.json#L1-L10) — Hook file exists as commented pseudo-JSON and must be converted to valid JSON.
- [.github/workflows/ci.yml:14-20](.github/workflows/ci.yml#L14-L20) — CI workflow passes `SUPABASE_URL` and `SUPABASE_KEY` to `npm run build`, but needs `SUPABASE_SERVICE_ROLE_KEY` for Vitest and Playwright test jobs.
- [AGENTS.md:36-37](AGENTS.md#L36-L37) — Documented build/test commands need updating to include `npm run test` and `npm run test:run`.
- [context/foundation/test-plan.md:47](context/foundation/test-plan.md#L47) — Phase 4 status needs updating from `change opened` to `complete`.

## What We're NOT Doing

- Adding new test cases (Phase 1-3 already established Vitest and Playwright test suites).
- Setting up local Docker containers inside GitHub Actions runners.
- Modifying `vitest.config.ts` or `playwright.config.ts` test runner configurations.

## Implementation Approach

1. **Local Agent Hooks & Documentation (Phase 1)**: Convert [.github/hooks/quality-gates.json](.github/hooks/quality-gates.json) to valid active JSON matching the `PostToolUse` pattern. Update [AGENTS.md](AGENTS.md) testing section.
2. **Unified CI Pipeline & Rollout Status (Phase 2)**: Update [.github/workflows/ci.yml](.github/workflows/ci.yml) to add `npm run test:run` and Playwright E2E testing with full Supabase secrets (`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Update [.github/workflows/playwright.yml](.github/workflows/playwright.yml) and mark Phase 4 complete in [context/foundation/test-plan.md](context/foundation/test-plan.md).

## Critical Implementation Details

- **JSON Hook Syntax**: [.github/hooks/quality-gates.json](.github/hooks/quality-gates.json) must be strictly valid JSON without `//` line comments, otherwise hook parsers fail silently or crash.
- **CI Secrets Handling**: Vitest and Playwright tests require `SUPABASE_SERVICE_ROLE_KEY` in workflow `env` blocks to execute admin table cleanups without authorization failures.

---

## Phase 1: Local Quality Gates and Documentation

### Overview

Activate the local agent post-edit hook for auto-formatting/linting and update repository guidelines to reflect current test infrastructure.

### Changes Required:

#### 1. Agent Hooks Configuration

**File**: `.github/hooks/quality-gates.json`

**Intent**: Activate the `PostToolUse` hook so that file edits trigger `npm run lint:fix -- --quiet` automatically.

**Contract**: Valid JSON file configuring `PostToolUse` matcher for `Write|Edit` tool operations.

#### 2. Repository Guidelines Documentation

**File**: `AGENTS.md`

**Intent**: Remove outdated "No dedicated unit test runner" note and document `npm run test` and `npm run test:run`.

**Contract**: Update "Testing and Verification" section in `AGENTS.md` with Vitest and Playwright instructions.

### Success Criteria:

#### Automated Verification:

- `.github/hooks/quality-gates.json` is valid JSON: `node -e "JSON.parse(fs.readFileSync('.github/hooks/quality-gates.json'))"`
- ESLint passes cleanly: `npm run lint`
- Typecheck passes cleanly: `npm run typecheck`

#### Manual Verification:

- Agent file edits execute the post-edit lint hook without error.
- Guidelines in `AGENTS.md` match current package.json test scripts.

---

## Phase 2: Unified CI Enforcement and Test Plan Sync

### Overview

Integrate Vitest integration tests and Playwright E2E tests into the main CI pipeline workflow with full Supabase secrets, align workflow triggers, and mark Phase 4 complete in the test plan.

### Changes Required:

#### 1. Main CI Workflow

**File**: `.github/workflows/ci.yml`

**Intent**: Add steps for Vitest integration tests (`npm run test:run`) and Playwright E2E tests (`npx playwright install --with-deps` and `npx playwright test`), supplying `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets.

**Contract**: GitHub Actions workflow step definitions in `.github/workflows/ci.yml`.

#### 2. Playwright CI Workflow Alignment

**File**: `.github/workflows/playwright.yml`

**Intent**: Align branch triggers (`master`) and environment secrets, or consolidate Playwright execution into `ci.yml`.

**Contract**: Updated `.github/workflows/playwright.yml` with `master` branch trigger and required Supabase secrets.

#### 3. Test Rollout Plan Status

**File**: `context/foundation/test-plan.md`

**Intent**: Update Phase 4 status from `change opened` to `complete` in §3 Phased Rollout table.

**Contract**: Status field in `context/foundation/test-plan.md` §3 table.

### Success Criteria:

#### Automated Verification:

- Production build succeeds: `npm run build`
- Vitest integration tests pass: `npm run test:run`
- Astro sync succeeds: `npx astro sync`

#### Manual Verification:

- GitHub Actions workflow syntax validated.
- `context/foundation/test-plan.md` reflects Phase 4 `complete` status.

---

## Testing Strategy

### Unit / Integration Tests:

- Run `npm run test:run` locally and verify all service integration tests pass against local Supabase.

### E2E Tests:

- Run `npx playwright test` locally and verify all specs (`edit-delete-recipe.spec.ts`, `recipe-mutation-api.spec.ts`, `search-recipes.spec.ts`, `seed.spec.ts`) pass.

### Manual Verification Steps:

1. Validate JSON syntax of `.github/hooks/quality-gates.json`.
2. Verify `.github/workflows/ci.yml` syntax and environment secret assignments.
3. Verify `AGENTS.md` and `context/foundation/test-plan.md` updates.

## Performance Considerations

- `npm run lint:fix -- --quiet` in `PostToolUse` finishes in <1 second per edit call.

## Migration Notes

- Ensure `SUPABASE_SERVICE_ROLE_KEY` repository secret is configured in GitHub repository settings.

## References

- Related research: `context/changes/testing-quality-gates/research.md`
- Test plan: `context/foundation/test-plan.md`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Local Quality Gates and Documentation

#### Automated

- [x] 1.1 `.github/hooks/quality-gates.json` is valid JSON
- [x] 1.2 ESLint passes cleanly (`npm run lint`)
- [x] 1.3 Typecheck passes cleanly (`npm run typecheck`)

#### Manual

- [x] 1.4 Agent file edits execute the post-edit lint hook without error
- [x] 1.5 Guidelines in `AGENTS.md` match current package.json test scripts

### Phase 2: Unified CI Enforcement and Test Plan Sync

#### Automated

- [ ] 2.1 Production build succeeds (`npm run build`)
- [ ] 2.2 Vitest integration tests pass (`npm run test:run`)
- [ ] 2.3 Astro sync succeeds (`npx astro sync`)

#### Manual

- [ ] 2.4 GitHub Actions workflow syntax validated
- [ ] 2.5 `context/foundation/test-plan.md` reflects Phase 4 `complete` status
