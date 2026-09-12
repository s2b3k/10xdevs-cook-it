# Edit and Delete Recipe Implementation Plan

## Overview

Implement the S-03 recipe maintenance slice so an authenticated user can edit every recipe field and replace its taxonomy tags, or delete an owned recipe with an explicit confirmation. The change keeps ownership boundaries at the service/RLS layer, makes one edit save transactionally consistent, and preserves the existing Astro SSR plus React island conventions.

## Current State Analysis

The recipe service already exposes user-scoped `updateRecipe` and `deleteRecipe`, but the API has no recipe-id mutation route, the edit schema/UI do not exist, and the detail page has no maintenance actions. Taxonomy tags can currently be assigned only through sequential client requests, with no operation that removes stale relations. The recipe-taxonomy foreign key cascades when a recipe is deleted, so deleting a recipe removes its join rows while preserving shared taxonomy records.

The existing detail route validates UUIDs before loading an owned recipe, `TaxonomyTagInput` already supports selecting, creating, and removing tags in controlled state, and integration fixtures cover two-account ownership plus relation cleanup. The repository uses JSON API responses, `RecipeDomainError`, `cn()`, accessible Playwright locators, `npm run typecheck`, `npm run lint`, `npm run test:run`, and `npm run build` as its quality gates.

## Desired End State

An authenticated user can open an owned recipe, choose Edit, change all recipe content fields and the complete taxonomy set, and save through `PATCH /api/recipes/:id`. The server commits recipe fields and relation replacement as one consistent operation, returning validation or not-found errors without leaking ownership information. The detail page also offers an accessible confirmation state for deletion; successful deletion removes the recipe and relations and redirects to `/recipes`.

Verification proves the transaction boundary, ownership isolation, strict resource-ID handling, validation contract, tag removal/replacement, cascade behavior, confirmation/redirect wiring, and one complete browser flow.

### Key Discoveries:

- `src/lib/services/recipe.service.ts` is the user-scoped ownership boundary and already maps database failures to stable domain errors.
- `supabase/migrations/20260526110003_create_recipe_taxonomy.sql` uses `on delete cascade` for recipe relations and `on delete restrict` for taxonomy records.
- `src/components/recipes/TaxonomyTagInput.tsx` already provides the controlled tag selection/create/remove interaction needed by the edit form.
- `src/pages/recipes/[id].astro` is the existing SSR detail surface and validates IDs with Zod before loading data.
- The archived S-01/S-02 work and test plan require JSON `{ data, error, fields }` responses, uniform `404` for missing/non-owned resources, and database-backed ownership tests.

## What We're NOT Doing

- No sharing, cross-account access, or administrative recipe management.
- No ingredient entity, ingredient autocomplete, normalization, ranking, pagination, or search redesign.
- No photo upload; editing continues to accept an optional photo URL only.
- No taxonomy administration, taxonomy deletion, synonym management, or taxonomy category editor.
- No optimistic UI or conflict-resolution protocol; concurrent edits remain last-confirmed-save-wins.
- No broad E2E coverage of every validation and authorization branch; those remain integration/API concerns.

## Implementation Approach

Add a small transactional database function for the complete recipe edit because the current client API cannot make a recipe-field update and relation replacement atomic. Expose that boundary through the existing user-scoped service, then add a strict JSON `PATCH` route and a `DELETE` route under the dynamic recipe API path. Build a dedicated edit page that reuses the existing form field and taxonomy components, and add detail-page actions with an in-page confirmation state. Keep the list page as the post-delete destination.

## Critical Implementation Details

### State sequencing

The edit request must carry the complete editable recipe representation and the complete taxonomy ID set so the server can replace relations deterministically. Taxonomy creation remains the existing inline interaction; the recipe save must not report success until the transactional recipe-plus-relations operation has completed.

### User experience spec

Delete must require an accessible confirmation state with explicit cancel and confirm actions. A successful delete redirects to `/recipes`; a failed delete keeps the user on the detail page and shows the server error without pretending the recipe was removed.

## Phase 1: Transactional Recipe Persistence

### Overview

Create the persistence contract that can update recipe fields and replace all taxonomy relations atomically, while tightening delete behavior so a missing or inaccessible recipe maps to the existing not-found domain error.

### Changes Required:

#### 1. Database transaction function

**File**: `supabase/migrations/20260912100001_add_recipe_update_transaction.sql`

**Intent**: Add one server-side transaction boundary for updating an owned recipe and replacing its taxonomy relation set.

**Contract**: The function accepts the recipe ID, all editable recipe values, and a complete UUID taxonomy set; it updates only the row owned by `auth.uid()`, removes old relations, inserts the supplied set, and returns the updated recipe representation. A missing or non-owned recipe must fail with a stable not-found signal, while foreign-key and validation violations remain integrity failures.

#### 2. Service and shared contracts

**Files**: `src/types.ts`, `src/lib/services/recipe.service.ts`, `src/lib/services/recipe.errors.ts`

**Intent**: Expose the transaction through the existing service abstraction and ensure deletion cannot silently succeed for a missing or inaccessible recipe.

**Contract**: Add the complete edit input shape and a service method for transactional recipe/tag replacement. Keep all queries scoped to the service user ID, map the transaction’s not-found and integrity signals to `RecipeDomainError`, and make `deleteRecipe` verify that exactly one owned recipe was deleted. Preserve existing create/search/detail behavior.

#### 3. Supabase test typing and service coverage

**Files**: `src/lib/services/__tests__/helpers.ts`, `src/lib/services/__tests__/recipe.service.integration.test.ts`

**Intent**: Extend the database-backed fixtures and tests to exercise the new transaction and deletion boundary with two authenticated users.

**Contract**: Tests must prove field updates, tag replacement including removal, empty tag sets, preservation of taxonomy records, cross-account update/delete rejection, and deletion of recipe relations through the existing cleanup/final-state inspection pattern.

### Success Criteria:

#### Automated Verification:

- The migration applies cleanly and the transactional function is callable through the typed Supabase client.
- Integration tests cover complete edit saves, tag removal/replacement, empty tags, ownership isolation, and delete cascade behavior.
- `npm run typecheck` passes for the service and test contracts.
- `npm run lint` passes for the touched persistence and test files.

#### Manual Verification:

- Inspect the SQL function and confirm it runs as the authenticated caller, checks recipe ownership, and cannot modify another account’s recipe.
- Confirm a recipe with tags can be updated to a different set and that shared taxonomy rows remain present.

## Phase 2: Recipe Mutation API

### Overview

Add the strict, ownership-safe JSON API boundary for edit and delete operations using the repository’s existing response and error conventions.

### Changes Required:

#### 1. Update schema

**File**: `src/lib/schemas/recipe.schemas.ts`

**Intent**: Define the complete edit payload and prevent malformed content or taxonomy IDs from reaching the service.

**Contract**: Export `UpdateRecipeBodySchema` for title, lead, ingredients, instructions, photo URL, and a taxonomy ID array. Required text fields follow the create schema, nullable optional fields preserve clear-value semantics, and every taxonomy ID must be a valid UUID.

#### 2. Dynamic recipe API route

**File**: `src/pages/api/recipes/[id]/index.ts`

**Intent**: Provide `PATCH` and `DELETE` operations for one owned recipe without duplicating service or auth logic.

**Contract**: Both handlers require an authenticated user, a strict UUID route ID, and an available Supabase client. `PATCH` validates JSON and returns `{ data: Recipe }` on success; `DELETE` returns an empty success response. Invalid input returns 400, missing/non-owned recipes return 404, unauthenticated requests return 401, unavailable configuration returns 503, and unexpected failures return 500. No response may reveal whether another user owns a supplied ID.

#### 3. Error mapping tests

**Files**: `src/pages/api/recipes/[id]/index.ts` and a focused route/API test file if the existing Vitest setup supports route invocation

**Intent**: Lock the HTTP contract independently of the browser.

**Contract**: Cover malformed UUIDs, invalid body fields, missing/non-owned IDs, successful patch/delete responses, unauthenticated requests, and service/integrity failures using the repository’s `{ error, fields }` response shape.

### Success Criteria:

#### Automated Verification:

- API tests verify the 401/400/404/503/500 mapping and successful PATCH/DELETE response shapes.
- `npm run typecheck` passes after adding the schema and dynamic route.
- `npm run lint` passes for the schema and route.
- `npm run build` completes with the dynamic SSR API route.

#### Manual Verification:

- Submit a complete PATCH payload and confirm the returned recipe contains updated fields.
- Submit an invalid ID or another account’s ID and confirm the response is 404 without ownership details.
- Delete a recipe through the API and confirm its detail request no longer exposes content.

## Phase 3: Edit and Delete User Experience

### Overview

Add the edit form/page and detail-page actions while preserving the existing visual language, controlled tag input, SSR detail loading, and accessible interaction patterns.

### Changes Required:

#### 1. Edit form

**File**: `src/components/recipes/EditRecipeForm.tsx`

**Intent**: Reuse the create-form field patterns for editing an existing recipe with initial server-provided values and taxonomy tags.

**Contract**: Accept a recipe and its current taxonomy list, initialize controlled fields, reuse `FormField`, `TaxonomyTagInput`, `ServerError`, `Button`, and `cn()`, validate required text before submission, submit the complete payload to `PATCH /api/recipes/:id`, preserve entered values on failure, and redirect to the recipe detail after success.

#### 2. Edit route

**File**: `src/pages/recipes/[id]/edit.astro`

**Intent**: Provide an SSR-authenticated edit surface that loads the owned recipe and current taxonomy set before hydrating the form.

**Contract**: Validate the ID strictly, reuse the existing service/not-found handling, render the edit form only for an owned recipe, expose a back/cancel path to the detail page, and show the existing controlled not-found or unavailable states for invalid or inaccessible resources.

#### 3. Detail actions and delete confirmation

**Files**: `src/pages/recipes/[id].astro`, `src/components/recipes/RecipeActions.tsx` (new, if interaction is kept out of Astro markup)

**Intent**: Add detail-only Edit and Delete actions without placing destructive controls on every recipe card.

**Contract**: Edit links to `/recipes/:id/edit`. Delete enters an accessible in-page confirmation state with cancel and confirm controls, calls `DELETE /api/recipes/:id`, shows an error if the request fails, and redirects to `/recipes` only after a successful response. Existing detail content and ownership-safe not-found behavior remain unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes for the edit page, form, and detail action component.
- `npm run lint` passes for the touched Astro and React files.
- `npm run build` completes with the dynamic edit route.

#### Manual Verification:

- Open an owned recipe, choose Edit, change text fields and tags, remove one tag, add another, and save.
- Cancel from the edit page and confirm the original detail view is unchanged.
- Start Delete, cancel it, and confirm the recipe remains; confirm deletion and verify redirect to `/recipes`.
- Trigger a failed save or delete and confirm the form/detail view remains usable with an explicit error.

## Phase 4: End-to-End Verification and Handoff

### Overview

Protect the full user-visible flow with one focused Playwright scenario and run all repository quality gates before marking the change ready for implementation review.

### Changes Required:

#### 1. Focused browser flow

**File**: `tests/edit-delete-recipe.spec.ts`

**Intent**: Verify the complete authenticated edit-then-delete workflow with isolated fixtures and accessible locators.

**Contract**: Create uniquely named recipes and taxonomies, edit content and taxonomy selection, assert the detail result, exercise cancel and confirm states, assert the list redirect and absence of the deleted recipe, and clean all fixtures in `finally`. Use role/label/text locators and state-based waits only.

#### 2. Context handoff

**Files**: `context/changes/edit-and-delete-recipe/change.md`, `context/foundation/roadmap.md`

**Intent**: Keep the change and roadmap state aligned as implementation begins.

**Contract**: The change remains `planned` until implementation updates it; the roadmap S-03 item remains `planning` and is advanced later by the implementation workflow. Record any verified manual gate results in the plan Progress section without changing phase titles.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` succeeds.
- `npm run typecheck` succeeds.
- `npm run lint` succeeds.
- `npm run test:run` succeeds with local Supabase configured.
- `npm run build` succeeds.
- The focused Playwright edit/delete scenario passes with authenticated state and fixture cleanup.

#### Manual Verification:

- The full edit flow preserves content and the selected taxonomy set after reload.
- The delete confirmation is understandable, cancellable, and cannot report success before the API confirms it.
- A second account cannot read, edit, or delete the first account’s recipe.

## Testing Strategy

### Unit Tests:

- Validate update payload parsing, strict UUID handling, empty taxonomy sets, and domain error mapping where isolated tests are practical.

### Integration Tests:

- Use `createTestContext()` to verify transactional recipe/tag replacement, relation removal, empty tag sets, delete cascade, shared taxonomy preservation, and two-account isolation.
- Exercise API status and response contracts for authentication, validation, not-found, and successful mutation cases.

### Manual Testing Steps:

1. Create a recipe with two taxonomy tags and open its detail page.
2. Edit the title, lead, ingredients, instructions, photo URL, remove one tag, and add another; save and reload.
3. Open edit again and cancel without saving; confirm the saved state remains intact.
4. Start deletion, cancel, then confirm; verify redirect to `/recipes` and absence from the list.
5. Attempt the same recipe ID as another authenticated account and verify the controlled not-found behavior.

## Performance Considerations

The slice adds one transactional RPC call for edits and one request for deletion. No search query, list bound, or indexing strategy changes. Keep the edit form responsive by preserving current values during requests; no optimistic mutation is required.

## Migration Notes

Add one forward migration for the transactional recipe update function. It is reversible by dropping the function, while existing tables, RLS policies, cascade behavior, and taxonomy records remain unchanged. The migration must be applied before the updated service is deployed.

## References

- Roadmap S-03: `context/foundation/roadmap.md`
- Product requirement FR-002: `context/foundation/prd.md`
- Test risk map: `context/foundation/test-plan.md`
- Existing recipe service: `src/lib/services/recipe.service.ts`
- Existing recipe detail page: `src/pages/recipes/[id].astro`
- Existing create form/tag input: `src/components/recipes/AddRecipeForm.tsx`, `src/components/recipes/TaxonomyTagInput.tsx`
- Existing API contract: `src/pages/api/recipes/index.ts`
- Existing integration fixtures: `src/lib/services/__tests__/helpers.ts`
- Existing browser flow: `tests/search-recipes.spec.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Transactional Recipe Persistence

#### Automated

- [x] 1.1 Migration applies and the transactional function is callable — 2efd035
- [x] 1.2 Integration tests cover field edits, tag replacement, empty tags, ownership, and delete cascade — 2efd035
- [x] 1.3 `npm run typecheck` passes for persistence changes — 2efd035
- [x] 1.4 `npm run lint` passes for persistence changes — 2efd035

#### Manual

- [x] 1.5 Transaction and shared-taxonomy preservation are reviewed — 2efd035

### Phase 2: Recipe Mutation API

#### Automated

- [x] 2.1 API tests cover authentication, validation, strict IDs, not-found, success, and failure mappings — a289756
- [x] 2.2 `npm run typecheck` passes for schema and route changes — a289756
- [x] 2.3 `npm run lint` passes for schema and route changes — a289756
- [x] 2.4 `npm run build` succeeds with the mutation route — a289756

#### Manual

- [x] 2.5 PATCH and DELETE responses are verified manually — a289756

### Phase 3: Edit and Delete User Experience

#### Automated

- [x] 3.1 `npm run typecheck` passes for edit UI changes — a129ec7
- [x] 3.2 `npm run lint` passes for edit UI changes — a129ec7
- [x] 3.3 `npm run build` succeeds with the edit route — a129ec7

#### Manual

- [x] 3.4 Edit, tag replacement, cancel, and failed-save states are verified — a129ec7
- [x] 3.5 Delete confirmation, cancel, failure, and redirect are verified — a129ec7

### Phase 4: End-to-End Verification and Handoff

#### Automated

- [x] 4.1 `npx astro sync` succeeds — e32c1df
- [x] 4.2 `npm run typecheck` succeeds — e32c1df
- [x] 4.3 `npm run lint` succeeds — e32c1df
- [x] 4.4 `npm run test:run` succeeds with hosted Supabase — e32c1df
- [x] 4.5 `npm run build` succeeds — e32c1df
- [x] 4.6 Focused Playwright edit/delete flow passes with cleanup — e32c1df

#### Manual

- [x] 4.7 Full authenticated edit/delete workflow is verified — e32c1df
- [x] 4.8 Cross-account access remains blocked — e32c1df
