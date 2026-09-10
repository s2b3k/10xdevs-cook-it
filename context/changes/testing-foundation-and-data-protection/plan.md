# Test Foundation and Data Protection Implementation Plan

## Overview

Establish the first deterministic integration-test foundation and verify the two highest-priority database boundaries for recipes: cross-account isolation (R3) and recipe-taxonomy integrity (R5). The tests will use Vitest and authenticated Supabase clients against local Supabase; they are not browser e2e tests.

## Current State Analysis

The repository has no test runner, test files, test scripts, or CI test gate. Recipe access is protected by both service-level `user_id` filters and Supabase RLS. Recipe-taxonomy ownership is transitive through the owned recipe, while taxonomy itself is intentionally shared.

The database already defines the required integrity guarantees: composite relation-key uniqueness, foreign keys, recipe-delete cascade, and taxonomy-delete restriction. Domain errors are mapped in the service layer, but the taxonomy assignment API currently returns HTTP 500 for all service errors. Phase 1 will test service/domain behavior and leave that API contract unchanged.

## Desired End State

Developers can run a documented Vitest integration suite against local Supabase and receive a clear failure when the required environment is unavailable. The suite uses real authenticated user sessions to prove that one account cannot access another account's recipes or relations, and it verifies that relation edge cases cannot create duplicates, invalid references, or orphaned rows.

The suite has explicit fixture cleanup, unique shared-resource names, deterministic `test` and `test:run` commands, and a cookbook entry explaining how to extend this test area.

### Key Discoveries:

- Recipe ownership is enforced twice: service filters in [src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts#L75-L144) and RLS policies in [supabase/migrations/20260526110004_enable_rls_and_policies.sql](supabase/migrations/20260526110004_enable_rls_and_policies.sql#L1-L61).
- Relation authorization is transitive through `recipes.user_id`; `recipe_taxonomy` has no direct owner column ([supabase/migrations/20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql#L1-L9)).
- R5 is enforced by the relation composite key and foreign-key delete behavior ([supabase/migrations/20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql#L1-L9)).
- No test infrastructure exists in [package.json](package.json#L1-L50) or [.github/workflows/ci.yml](.github/workflows/ci.yml#L1-L30).

## What We're NOT Doing

- No Playwright, browser automation, Astro route bootstrapping, or user-interface e2e tests.
- No CI provisioning; CI quality-gate wiring belongs to the later rollout phase.
- No correction of the taxonomy category fallback or assignment API HTTP status mapping.
- No schema or RLS migration changes unless an integration test disproves the existing contract.
- No extension or replacement of the existing authentication mechanism.

## Implementation Approach

Add Vitest as a Node-based test runner and place the integration suite beside the recipe service. Build helpers around the existing Supabase client that create two authenticated users and scoped clients, create unique recipe/taxonomy fixtures, and clean up every resource after each test. Use the authenticated clients for RLS assertions; never use a service-role client for the authorization assertions.

Keep assertions at two levels: domain errors from service calls and final database state. This prevents tests from passing merely because an operation returned an HTTP response or because one row exists.

## Critical Implementation Details

Integration tests must fail fast when local Supabase or required test environment variables are unavailable. Skipping the suite would make the data-protection gate appear green without testing RLS. Fixture cleanup may require a narrowly scoped privileged cleanup client, but all R3 assertions must execute through normal authenticated clients so RLS remains in the path.

## Phase 1: Test Foundation and Authenticated Fixtures

### Overview

Install and configure the runner, add deterministic commands, validate the integration environment, and provide reusable authenticated fixture helpers.

### Changes Required:

#### 1. Test runner and package scripts

**Files**: `package.json`, `vitest.config.ts`

**Intent**: Add Vitest with a Node test environment and path resolution compatible with the existing TypeScript source. Provide watch and single-run commands that make the suite discoverable locally.

**Contract**: `npm run test` runs Vitest in development mode; `npm run test:run` runs the integration suite once and exits non-zero on failure. Test discovery is limited to the intended integration-test location.

#### 2. Supabase test helpers

**File**: `src/lib/services/__tests__/helpers.ts`

**Intent**: Centralize environment validation, authenticated client creation, unique fixture naming, fixture creation, and cleanup so each test expresses the risk it verifies rather than setup mechanics.

**Contract**: Helpers expose two distinct authenticated users/clients, recipe and taxonomy fixture creation, relation cleanup, and per-test teardown. Missing URL/key or unreachable local Supabase produces a clear setup failure.

### Success Criteria:

#### Automated Verification:

- Vitest is installed and configured for Node/TypeScript execution.
- `npm run test:run` reaches the integration suite and fails clearly when Supabase prerequisites are absent.
- Authenticated fixture helpers can create and clean up two users, recipes, taxonomy rows, and relations against local Supabase.

#### Manual Verification:

- Start local Supabase with `npx supabase start`, provide the documented local URL and anon key, and confirm the foundation suite starts without setup errors.
- Stop or unset the local Supabase prerequisite and confirm the test command reports an actionable failure rather than silently skipping.

## Phase 2: R3 Data-Isolation Integration Tests

### Overview

Prove that authenticated account B cannot read or modify account A's recipes or recipe-taxonomy relations, while preserving the intentional shared-taxonomy behavior.

### Changes Required:

#### 1. Recipe ownership scenarios

**File**: `src/lib/services/__tests__/recipe.service.integration.test.ts`

**Intent**: Exercise list, update, and delete operations with two authenticated service instances and verify that account B cannot observe or mutate account A's recipe.

**Contract**: Tests assert the resulting recipe state and the mapped domain error behavior, not just a rejected promise. Account A's recipe remains intact after every account B attempt.

#### 2. Relation ownership scenarios

**File**: `src/lib/services/__tests__/recipe.service.integration.test.ts`

**Intent**: Exercise relation insertion and deletion across account boundaries, relying on the join-table RLS `EXISTS` predicate through real authenticated clients.

**Contract**: Account B cannot create or remove a relation attached to account A's recipe. A taxonomy row may be shared and usable by the rightful recipe owner; taxonomy ownership is not asserted.

### Success Criteria:

#### Automated Verification:

- Account B's recipe list cannot return account A's recipe.
- Account B cannot update or delete account A's recipe, and the original row remains unchanged.
- Account B cannot assign or remove a taxonomy relation on account A's recipe.
- Account A can still read and mutate its own recipe and relation fixtures.

#### Manual Verification:

- Review a failing-test mutation by temporarily removing the relevant ownership predicate and confirm the R3 suite detects the regression.

## Phase 3: R5 Relation-Integrity Integration Tests

### Overview

Verify every relation-level guarantee identified in the research: duplicate prevention, foreign-key rejection, recipe cascade, and taxonomy restriction.

### Changes Required:

#### 1. Insert constraints and duplicate behavior

**File**: `src/lib/services/__tests__/recipe.service.integration.test.ts`

**Intent**: Exercise duplicate assignment and missing recipe/taxonomy references through the service and inspect mapped domain errors plus final relation state.

**Contract**: A duplicate pair produces the conflict path and leaves exactly one relation; invalid references produce the integrity path and leave no partial relation.

#### 2. Delete behavior and orphan prevention

**File**: `src/lib/services/__tests__/recipe.service.integration.test.ts`

**Intent**: Verify that deleting a recipe removes its relations without deleting taxonomy rows, while deleting a taxonomy still referenced by a relation is rejected.

**Contract**: Cascade and restrict behavior are asserted by querying all affected rows after the operation, not only by checking the operation's error or success.

### Success Criteria:

#### Automated Verification:

- Duplicate recipe-taxonomy assignment maps to the conflict domain error and preserves one relation.
- Missing recipe and missing taxonomy references map to integrity errors and create no relation.
- Deleting a recipe removes all of its relations and leaves taxonomy records intact.
- Deleting a referenced taxonomy fails and leaves both the taxonomy and relation intact.

#### Manual Verification:

- Inspect the local database after the suite and confirm no fixture relations or test users remain.

## Phase 4: Verification and Handoff

### Overview

Run the focused suite and existing quality gates, document the cookbook recipe, and leave the change ready for implementation review.

### Changes Required:

#### 1. Documentation and quality verification

**Files**: `context/foundation/test-plan.md`, `context/changes/testing-foundation-and-data-protection/plan.md`

**Intent**: Record the runnable integration-test command, fixture location, local Supabase prerequisite, and the completed Phase 1 cookbook entry. Keep CI wiring and later rollout work explicitly pending.

**Contract**: The cookbook entry answers where to add ownership/relation tests, how to run them, and which reference test/helper to follow.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` passes with local Supabase running.
- `npm run lint` passes.
- `npm run build` passes.
- `npx astro sync` passes if required independently by the repository workflow.
- The Phase 1 cookbook entry is no longer marked TBD.

#### Manual Verification:

- Confirm the test suite is integration-only and does not require a browser or Astro dev server.
- Confirm the documented setup and cleanup steps work from a clean local checkout.

**Implementation Note**: After completing this phase and all automated verification passes, pause for human confirmation of the manual checks before proceeding to the next rollout phase.

## Testing Strategy

### Unit Tests:

- No isolated unit-test layer is required for this phase. The risks depend on real Supabase authentication, RLS, foreign keys, and database state.

### Integration Tests:

- Use real authenticated Supabase clients for every R3 assertion.
- Cover recipe read/update/delete isolation and relation insert/delete isolation.
- Cover duplicate relation assignment, missing foreign keys, recipe cascade, and taxonomy restrict behavior.
- Assert domain error codes and resulting rows; do not rely only on HTTP status or row existence.

### Manual Testing Steps:

1. Start local Supabase and configure the test URL/key.
2. Run `npm run test:run` and inspect the R3/R5 results.
3. Stop Supabase or remove the variables and verify the suite fails with an actionable prerequisite message.
4. Check the local database for leftover fixture rows after completion.

## Performance Considerations

Keep the suite serial or use isolated fixture names if parallel execution is enabled. Auth setup and database round trips are intentionally accepted because RLS signal is more important than mock-test speed in this phase.

## Migration Notes

No database migration is planned. Tests consume the existing migrations and constraints. CI provisioning of Supabase is deferred to the later quality-gates phase.

## References

- Research: [context/changes/testing-foundation-and-data-protection/research.md](context/changes/testing-foundation-and-data-protection/research.md)
- RLS policies: [supabase/migrations/20260526110004_enable_rls_and_policies.sql](supabase/migrations/20260526110004_enable_rls_and_policies.sql#L1-L73)
- Relation constraints: [supabase/migrations/20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql#L1-L9)
- Service behavior: [src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts#L55-L173)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Test Foundation and Authenticated Fixtures

#### Automated

- [x] 1.1 Vitest is installed and configured for Node/TypeScript execution — 586a678
- [x] 1.2 `npm run test:run` reaches the integration suite and fails clearly when Supabase prerequisites are absent — 586a678
- [x] 1.3 Authenticated fixture helpers create and clean up two users, recipes, taxonomy rows, and relations — 586a678

#### Manual

- [x] 1.4 Hosted non-production Supabase setup starts the foundation suite without setup errors — 586a678
- [x] 1.5 Missing Supabase prerequisites produce an actionable failure — 586a678

### Phase 2: R3 Data-Isolation Integration Tests

#### Automated

- [x] 2.1 Account B cannot read account A's recipe — 435b8f6
- [x] 2.2 Account B cannot update or delete account A's recipe — 435b8f6
- [x] 2.3 Account B cannot assign or remove a relation on account A's recipe — 435b8f6
- [x] 2.4 Account A can access its own recipe and relation fixtures — 435b8f6

#### Manual

- [x] 2.5 Removing an ownership predicate makes the R3 suite fail — 435b8f6

### Phase 3: R5 Relation-Integrity Integration Tests

#### Automated

- [x] 3.1 Duplicate assignment preserves one relation and maps to conflict — f7420ea
- [x] 3.2 Missing references map to integrity errors with no relation created — f7420ea
- [x] 3.3 Recipe deletion cascades relations while preserving taxonomy rows — f7420ea
- [x] 3.4 Referenced taxonomy deletion is rejected and preserves relation state — f7420ea

#### Manual

- [x] 3.5 The local database contains no leftover fixture relations or users — f7420ea

### Phase 4: Verification and Handoff

#### Automated

- [x] 4.1 `npm run test:run` passes with local Supabase running — 494aa3b
- [x] 4.2 `npm run lint` passes — 494aa3b
- [x] 4.3 `npm run build` passes — 494aa3b
- [x] 4.4 `npx astro sync` passes when run independently — 494aa3b
- [x] 4.5 Phase 1 cookbook entry is no longer TBD — 494aa3b

#### Manual

- [x] 4.6 Suite is integration-only and needs no browser or Astro server — 494aa3b
- [x] 4.7 Setup and cleanup work from a clean checkout — 494aa3b
