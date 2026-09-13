# Testing Quality Gates and CI Enforcement — Plan Brief

> Full plan: `context/changes/testing-quality-gates/plan.md`
> Research: `context/changes/testing-quality-gates/research.md`

## What & Why

Establish complete, enforceable quality gates across local agent workflows, git hooks, and GitHub Actions CI. Currently, Vitest integration tests and Playwright E2E tests are not enforced in main CI runs, agent per-edit post-tool-use hooks are commented out, and `AGENTS.md` documentation is outdated.

## Starting Point

Local pre-commit hook runs `lint-staged` and `npm run typecheck` via Husky. Main CI workflow (`.github/workflows/ci.yml`) runs `lint` and `build` but omits `npm run test:run`. Agent hooks (`.github/hooks/quality-gates.json`) are disabled. Playwright workflow runs separately without Supabase credentials.

## Desired End State

A three-layered quality gate system:
1. **Layer 1 (Local Agent Hook)**: `.github/hooks/quality-gates.json` running `npm run lint:fix -- --quiet` on `Write|Edit`.
2. **Layer 2 (Git Pre-Commit Hook)**: Husky running `lint-staged` and `npm run typecheck`.
3. **Layer 3 (Unified CI Pipeline)**: `.github/workflows/ci.yml` enforcing lint, sync, Vitest integration suite, production build, and Playwright E2E tests with `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Vitest CI execution | Remote test credentials in CI secrets | Provides fast, reliable integration test execution without Docker setup overhead in CI runners. | Plan |
| Playwright CI integration | Consolidate into `.github/workflows/ci.yml` | Ensures single unified CI status check and prevents trigger branch drift. | Plan |
| Local agent hook | Fast per-edit `npm run lint:fix -- --quiet` | Gives agent immediate feedback on syntax/formatting errors per file modification. | Plan |
| Test documentation | Update `AGENTS.md` & `test-plan.md` | Keeps contributor docs and test rollout status aligned with reality. | Plan |

## Scope

**In scope:**
- Activate `.github/hooks/quality-gates.json` with valid JSON configuration for `PostToolUse`.
- Update `.github/workflows/ci.yml` to include `npm run test:run` (Vitest integration tests) and Playwright E2E test execution with `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` env vars.
- Align `.github/workflows/playwright.yml` trigger branches and secrets.
- Update `AGENTS.md` and `context/foundation/test-plan.md` §3 Phase 4 status to `complete`.

**Out of scope:**
- Adding new unit or integration test cases (covered in Phases 1-3).
- Setting up local Docker-in-Docker in GitHub Actions.
- Changing Vitest or Playwright core runner settings.

## Architecture / Approach

The quality gate architecture consists of 3 deterministic layers:
1. **Agent Per-Edit Hook**: `.github/hooks/quality-gates.json` listens on `PostToolUse` for `Write|Edit` operations and executes `npm run lint:fix -- --quiet`.
2. **Developer Pre-Commit Hook**: Husky + `lint-staged` formats changed files and verifies full-workspace TypeScript safety (`npm run typecheck`).
3. **Unified CI Pipeline**: `.github/workflows/ci.yml` runs on push/PR to `master`, executing lint, typecheck/sync, Vitest integration suite, production build, and Playwright E2E tests.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Local Agent Hooks & Documentation | Active per-edit post-tool-use agent hook & updated `AGENTS.md` | Invalid JSON syntax in hook file breaking tool output |
| 2. Unified CI Enforcement & Test Plan Sync | Consolidated `ci.yml` running lint, sync, Vitest, build, and Playwright with secrets | Missing CI secrets causing test step failure |

**Prerequisites:** GitHub repository secrets (`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) configured in GitHub repo.  
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- **CI Secrets**: Assumes `SUPABASE_SERVICE_ROLE_KEY` is present in GitHub Repository Secrets alongside `SUPABASE_URL` and `SUPABASE_KEY`.

## Success Criteria (Summary)

- Agent edits trigger post-tool-use `npm run lint:fix -- --quiet` without JSON parsing errors.
- `ci.yml` passes `npm run test:run` and Playwright tests when triggered on PRs/pushes to `master`.
- `AGENTS.md` and `context/foundation/test-plan.md` reflect Phase 4 completion.
