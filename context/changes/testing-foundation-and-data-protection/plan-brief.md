# Test Foundation and Data Protection — Plan Brief

> Full plan: `context/changes/testing-foundation-and-data-protection/plan.md`
> Research: `context/changes/testing-foundation-and-data-protection/research.md`

## What & Why

This change establishes the first real integration-test foundation for the recipe domain and verifies that account boundaries and relation constraints hold in Supabase. It targets R3 and R5 with authenticated database tests, not browser e2e tests.

## Starting Point

The repository currently has no test runner or test files. The database already has RLS, composite relation keys, foreign keys, cascade behavior, and restrict behavior, while services add user-scoped filters and domain error mapping.

## Desired End State

Developers can run a deterministic Vitest suite against local Supabase with two authenticated users. The suite proves that users cannot access each other's recipes or relations and that duplicate, invalid, cascade, and restrict operations preserve database integrity.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Test boundary | Service-level database integration | Gives direct RLS and constraint signal without browser/server harness overhead | Research / Plan |
| User fixtures | Two real authenticated users per suite | Directly exercises `auth.uid()` and avoids false confidence from service-role bypass | Research / Plan |
| Error scope | Preserve current API statuses; assert service domain errors | Keeps Phase 1 focused and avoids bundling an API contract change | Research / Plan |
| Runner | Vitest with `test` and `test:run` scripts | Fits the TypeScript/ESM stack and supports future phases | Research |
| Cleanup | Explicit teardown plus unique fixture names | Prevents order dependence without bypassing RLS assertions | Plan |
| R5 coverage | Duplicate, FK, cascade, and restrict cases | Covers every relation guarantee identified in the research | Research / Plan |
| Environment | Fail fast when local Supabase is unavailable | Prevents a green rollout with untested RLS | Plan |

## Scope

**In scope:**

- Vitest configuration and package scripts.
- Authenticated Supabase fixture and cleanup helpers.
- R3 recipe and relation isolation tests.
- R5 relation uniqueness, FK, cascade, and restrict tests.
- Local setup documentation and Phase 1 cookbook update.

**Out of scope:**

- Browser e2e or Playwright tests.
- CI Supabase provisioning.
- API error-status correction.
- Taxonomy category fallback correction.
- Authentication redesign or schema migrations.

## Architecture / Approach

Vitest runs Node-based integration tests against local Supabase. Helpers create two authenticated clients and scoped service instances; tests perform operations through those clients and inspect both domain errors and final database state. Cleanup is explicit, while service-role access is reserved only for narrowly scoped teardown if required.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Foundation | Runner, environment guard, authenticated fixtures, cleanup | Tests must not bypass RLS |
| 2. R3 isolation | Cross-account read and mutation protection | Logged-in does not imply ownership |
| 3. R5 integrity | Duplicate, FK, cascade, and restrict coverage | Relations must not become invalid or orphaned |
| 4. Handoff | Quality gates and cookbook instructions | Coverage must remain runnable and discoverable |

**Prerequisites:** Docker, local Supabase, Node.js 22.14.0, and local Supabase URL/key values.
**Estimated effort:** ~2-3 implementation sessions across four focused phases.

## Open Risks & Assumptions

- Local Supabase auth setup may require a small project-specific helper adjustment once the first test is executed.
- CI execution is intentionally deferred and must be addressed by the later quality-gates phase.
- Current API status behavior remains 500 for assignment failures until a separate contract change is approved.

## Success Criteria (Summary)

- The integration suite runs deterministically and fails clearly without its Supabase prerequisite.
- Two authenticated accounts cannot read or mutate each other's recipes or recipe-taxonomy relations.
- R5 edge cases leave the database consistent, with no duplicate or orphaned relations.