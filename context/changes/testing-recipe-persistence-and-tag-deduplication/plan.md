# Recipe Persistence and Tag Deduplication Implementation Plan

## Overview

Protect the recipe write path with explicit server validation, actionable taxonomy-assignment errors, and integration coverage that proves database state. The plan covers test rollout Phase 2 risks R1, R2, and R4 without changing the intentionally partial initial-create workflow.

## Current State Analysis

Recipe creation succeeds through `POST /api/recipes`, then the client issues one separate taxonomy-assignment request per selected tag. The form already redirects with a warning after one or more assignment failures, but the taxonomy assignment route accepts non-UUID path IDs and maps all domain failures to `500`. Write schemas also accept unknown keys by stripping them, and their string constraints permit whitespace-only input until the service rejects it.

Taxonomy identity is protected by a case-insensitive database expression index. `createOrGetTaxonomy()` handles a unique conflict by returning the existing taxonomy, but no integration test proves the conflict lookup and stable row count. Existing tests offer an authenticated Supabase fixture for database inspection plus Playwright HTTP mutation coverage.

## Desired End State

Recipe and taxonomy write APIs reject malformed, missing, whitespace-only, unknown, and invalid-reference input with consistent client-actionable `4xx` responses before unintended persistence. Equivalent taxonomy inputs resolve to one database record. When a tag assignment fails after a recipe is created, the recipe and already-successful assignments remain persisted, and the user is redirected with the established warning signal.

### Key Discoveries:

- `src/lib/schemas/recipe.schemas.ts` uses permissive Zod object schemas and does not trim required write fields.
- `src/pages/api/recipes/[id]/taxonomy.ts` lacks UUID validation for `context.params.id` and converts all service failures to `500`.
- `src/lib/services/taxonomy.service.ts` returns the pre-existing taxonomy after PostgreSQL error `23505`; `supabase/migrations/20260526110002_create_taxonomy.sql` is the authoritative uniqueness guarantee.
- `src/components/recipes/AddRecipeForm.tsx` defines the partial-success contract as a redirect to `/recipes?warning=...` after failed assignment requests.
- `src/lib/services/__tests__/helpers.ts` supports isolated authenticated fixtures and independent service-role state inspection.

## What We're NOT Doing

- Do not make recipe creation and taxonomy assignment atomic or replace the client-coordinated workflow.
- Do not redesign taxonomy UX, warning copy, or the recipe form beyond preserving its existing redirect contract.
- Do not add broad e2e coverage, CI enforcement, or coverage for search correctness; those belong to later test-rollout phases.
- Do not change database schema, RLS policies, or the taxonomy uniqueness index.

## Implementation Approach

First align the server contract at the Zod and taxonomy-assignment route boundaries. Then add a Supabase-backed test focused on the database's canonical taxonomy guarantee. Finally, extend the existing authenticated Playwright mutation suite with route-level negative cases and one browser form scenario that makes partial success observable, using independent service-role reads for persistence assertions.

## Phase 1: Align Write Validation and Assignment Errors

### Overview

Make server input acceptance explicit and make taxonomy assignment failures meaningful to the existing form client.

### Changes Required:

#### 1. Recipe and Taxonomy Write Schemas

**File**: `src/lib/schemas/recipe.schemas.ts`

**Intent**: Reject unknown body keys and whitespace-only required text consistently at the API boundary, rather than silently dropping fields or relying on a later service failure.

**Contract**: All write body schemas are strict; required textual fields trim before applying their non-empty rule. Optional text keeps its current nullable/optional semantics. UUID-bearing fields retain UUID validation.

#### 2. Taxonomy Assignment Route

**File**: `src/pages/api/recipes/[id]/taxonomy.ts`

**Intent**: Validate the recipe path ID before invoking Supabase and map expected domain failures to typed `4xx` JSON responses so the form can distinguish an assignment failure from a server fault.

**Contract**: An invalid recipe ID receives the same not-found-style response as `PATCH` and `DELETE`; malformed bodies remain `400`; not-found/authorization failures return `404`; validation or integrity failures return `400`; duplicate-relation conflicts return `409`; unexpected errors remain `500`.

### Success Criteria:

#### Automated Verification:

- Focused API tests demonstrate strict unknown-key rejection, whitespace-only rejection, invalid recipe-ID handling, and typed assignment errors.
- `npm run typecheck` passes.
- `npm run lint` passes.

#### Manual Verification:

- Submit a recipe with an assignable taxonomy and confirm the normal recipe-list redirect still succeeds.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Prove Canonical Taxonomy Persistence

### Overview

Add database-backed proof that equivalent tag writes return one canonical taxonomy and never grow the taxonomy table.

### Changes Required:

#### 1. Taxonomy Service Integration Coverage

**File**: `src/lib/services/__tests__/taxonomy.service.integration.test.ts`

**Intent**: Exercise the real `createOrGetTaxonomy()` conflict path, not only input normalization, against the local Supabase database.

**Contract**: Create a unique taxonomy once, request it again with different casing and surrounding whitespace, assert that the second response has the same ID and `isNew: false`, and use the admin fixture to assert the matching canonical identity has exactly one row. Register created records with fixture cleanup.

#### 2. Shared Fixture Usage

**File**: `src/lib/services/__tests__/helpers.ts`

**Intent**: Extend fixture tracking only if the new test cannot register service-created taxonomies through the existing public context arrays.

**Contract**: Cleanup continues in dependency order and never leaves service-created taxonomy records or users behind.

### Success Criteria:

#### Automated Verification:

- `npm run test:run -- src/lib/services/__tests__/taxonomy.service.integration.test.ts` passes with local Supabase and required test credentials.
- The test asserts identical taxonomy IDs and an unchanged database row count for equivalent writes.
- `npm run typecheck` passes.

#### Manual Verification:

- Inspect the test output to confirm it uses local Supabase rather than a mocked taxonomy client.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Verify API Outcomes and Partial Tag Assignment

### Overview

Prove the public HTTP contract rejects invalid input and that partial assignment preserves the recipe while surfacing the form warning signal.

### Changes Required:

#### 1. Recipe Mutation API Coverage

**File**: `tests/recipe-mutation-api.spec.ts`

**Intent**: Extend the existing authenticated request suite with independent negative requests and state inspection for R2 and R4.

**Contract**: Cover malformed JSON, missing required fields, wrong primitive types, whitespace-only values, invalid UUIDs, unexpected keys, and nonexistent taxonomy references. Each request asserts its `4xx` response and, where applicable, verifies via the admin client that no invalid relation or extra record was persisted. Tests use unique suffixes and `finally` cleanup.

#### 2. Add Recipe Form Partial-Success Scenario

**File**: `tests/recipe-mutation-api.spec.ts`

**Intent**: Drive the existing form through a recipe creation, one successful assignment, and one forced assignment failure to prove the warning redirect is visible at the browser boundary.

**Contract**: The scenario selects controlled taxonomies, observes the form redirect to `/recipes?warning=...`, then uses an independent admin read to prove the recipe and successful relation remain while the failed relation does not. It asserts the redirect signal, not presentation copy, and waits on URL or response state rather than elapsed time.

### Success Criteria:

#### Automated Verification:

- `npx playwright test tests/recipe-mutation-api.spec.ts` passes against the configured authenticated local application.
- Negative API cases return the planned `4xx` statuses and leave no invalid persistence.
- The partial-assignment scenario proves persisted partial state and the warning redirect query signal.
- `npm run test:run`, `npm run typecheck`, and `npm run lint` pass with local Supabase credentials configured.

#### Manual Verification:

- In the browser, force one taxonomy-assignment request to fail after another succeeds and confirm the recipe list opens with the partial-save warning.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No mock-only unit test is required for this phase; the risks depend on the real database, routes, and browser redirect contract.

### Integration Tests:

- Use Vitest with local Supabase to prove database-enforced canonical taxonomy behavior and stable row counts.
- Use authenticated Playwright request tests for the API's rejection and error-status contract.
- Use one browser-level form scenario only for the client-coordinated partial-success redirect.

### Manual Testing Steps:

1. Create a recipe with valid tags and confirm its normal redirect remains `/recipes`.
2. Submit a controlled partial-assignment failure after a successful assignment and confirm the warning appears after redirect.
3. Submit an unknown request field through a direct API client and confirm it receives a validation response rather than being silently ignored.

## Performance Considerations

The added tests use a small, isolated fixture set. Do not add retry or polling delays; wait for request and navigation state so suite runtime stays bounded and deterministic.

## Migration Notes

No database migration is required. The change narrows API acceptance by rejecting previously ignored unknown keys; first-party callers must continue to send only documented fields.

## References

- Related research: `context/changes/testing-recipe-persistence-and-tag-deduplication/research.md`
- Test rollout: `context/foundation/test-plan.md`
- Existing service fixture: `src/lib/services/__tests__/helpers.ts`
- Existing API mutation coverage: `tests/recipe-mutation-api.spec.ts`
- Canonical uniqueness constraint: `supabase/migrations/20260526110002_create_taxonomy.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Align Write Validation and Assignment Errors

#### Automated

- [x] 1.1 Add strict, normalized write-schema and taxonomy-assignment route tests
- [x] 1.2 Run npm run typecheck
- [x] 1.3 Run npm run lint

#### Manual

- [x] 1.4 Confirm successful assignment preserves normal recipe-list redirect

### Phase 2: Prove Canonical Taxonomy Persistence

#### Automated

- [ ] 2.1 Run focused taxonomy service integration test
- [ ] 2.2 Assert equivalent taxonomy writes return one ID and one database row
- [ ] 2.3 Run npm run typecheck

#### Manual

- [ ] 2.4 Confirm the taxonomy test uses local Supabase without mocks

### Phase 3: Verify API Outcomes and Partial Tag Assignment

#### Automated

- [ ] 3.1 Run recipe mutation Playwright coverage
- [ ] 3.2 Assert negative API cases return 4xx without invalid persistence
- [ ] 3.3 Assert partial assignment preserves state and emits warning redirect
- [ ] 3.4 Run integration tests, typecheck, and lint

#### Manual

- [ ] 3.5 Confirm a forced partial assignment shows the warning after redirect
