# Search Recipes Autocomplete and Details Implementation Plan

## Overview

Implement S-02, the north-star recipe discovery flow. Authenticated users will filter their own recipes by one or more taxonomy values and an ingredient fragment, receive deterministic result cards, and open an SSR recipe detail page with the complete recipe content.

The implementation preserves the existing Astro SSR, Supabase service, RLS, and React-island conventions. Search remains an MVP text filter over `recipes.ingredients`; ingredient autocomplete, normalized ingredient entities, ranking, and sharing remain out of scope.

## Current State Analysis

- `RecipeService` supports create, list, update, delete, and taxonomy assignment, but has no filtered search or single-recipe read method.
- `GET /api/recipes` currently returns every recipe owned by the authenticated user and has no query validation.
- `TaxonomyService.searchTaxonomy()` already provides case-insensitive substring autocomplete with a limit of 20.
- `/recipes` is an SSR list page with a React form pattern available from `AddRecipeForm` and `TaxonomyTagInput`, but its cards are not links and there is no search UI.
- There is no `/recipes/[id]` detail page.
- RLS already limits recipe reads and recipe-taxonomy reads to the current account; no migration is required for the MVP query shape.
- The prior S-02 frame settles open taxonomy, case-insensitive trimmed ingredient fragments, AND semantics, and explicit empty results.

## Desired End State

An authenticated user can open `/recipes`, choose multiple taxonomy values through autocomplete, enter an ingredient fragment, and see the newest matching recipes update automatically after debounce. Each result is unique, clearly identifies the recipe, and links to `/recipes/[id]`.

The detail route server-renders the owned recipe, its taxonomy labels, ingredients, instructions, optional lead, and optional photo link. A valid search with no matches returns HTTP 200 with `{ data: [] }` and an explicit empty state; service failures and missing or unauthorized detail records remain distinguishable.

### Key Discoveries

- `src/lib/services/recipe.service.ts` is the owning abstraction for user-scoped recipe reads and maps database rows to `Recipe`.
- `src/lib/services/taxonomy.service.ts` establishes the autocomplete precedent and 20-item suggestion limit.
- `src/pages/api/recipes/index.ts` is the existing JSON endpoint to extend; it already owns auth, Supabase availability, and error response conventions.
- `src/pages/recipes/index.astro` already performs SSR list loading and is the natural search surface.
- `src/lib/services/__tests__/helpers.ts` provides authenticated users, admin cleanup, recipe fixtures, taxonomy fixtures, and relation fixtures.
- `tests/seed.spec.ts` demonstrates the existing authenticated Playwright setup and accessible locator style.

## What We're NOT Doing

- No ingredient autocomplete or separate ingredient table.
- No ingredient normalization, stemming, synonym matching, diacritic folding, or semantic search.
- No ranking beyond the existing newest-first ordering.
- No pagination, infinite scrolling, or virtualized result lists in this slice; apply a bounded result limit.
- No edit or delete controls on the detail page; those belong to S-03.
- No taxonomy administration, moderation, synonym management, or migration to a closed vocabulary.
- No new database index unless measured p95 performance demonstrates a need after the MVP query is implemented.
- No sharing or cross-account recipe access.

## Implementation Approach

Extend the user-scoped recipe service with a single search contract that accepts optional ingredient text and taxonomy IDs, normalizes the text, applies every supplied condition, removes duplicate rows, and orders results newest first with a bounded limit. Add a single-recipe read contract for the detail page. Extend `GET /api/recipes` with validated optional query parameters while preserving the existing no-parameter list behavior.

Keep taxonomy autocomplete on the existing `GET /api/taxonomy` endpoint. Build the search controls and result cards as a React island on the existing `/recipes` SSR page, using debounced requests and request sequencing so stale responses cannot replace newer results. Render `/recipes/[id]` through Astro SSR and the service layer, with explicit not-found and service-error states.

## Critical Implementation Details

### State sequencing

Search requests must be associated with the filter state that created them. If a slower response arrives after a newer request, it must not overwrite the newer result set. Clearing both filters should restore the normal owned-recipe list without treating the empty query as an error.

### Performance constraints

The API must cap returned results and preserve newest-first ordering. Add a manual or scripted timing check against a representative fixture set for the roadmap target of p95 <= 1.5 seconds; only add a migration for ingredient search indexing if the measured MVP query misses that target.

## Phase 1: Search Service and API Contract

### Overview

Add the domain contracts for filtered recipe reads and single-recipe reads, validate query parameters, and extend the existing recipes endpoint without changing ownership or RLS behavior.

### Changes Required:

#### 1. Recipe service search and detail contracts

**File**: `src/lib/services/recipe.service.ts`

**Intent**: Make filtered search and owned single-recipe retrieval available through the existing user-scoped service rather than embedding Supabase queries in routes or pages.

**Contract**: Extend `RecipeService` with a search method accepting optional trimmed ingredient text, a list of taxonomy UUIDs, and a bounded result limit, plus a method to retrieve one owned recipe by UUID. Search must apply ingredient and all taxonomy conditions as AND, return unique recipes newest first, and return an empty array for no matches. A missing owned recipe must map to the repository's not-found domain error.

#### 2. Search query validation

**File**: `src/lib/schemas/recipe.schemas.ts`

**Intent**: Keep malformed UUIDs, invalid limits, and unusable query values out of the service and make the API contract explicit.

**Contract**: Add a schema for the query shape used by `GET /api/recipes`: optional `ingredient`, optional repeated taxonomy IDs, and optional bounded limit. Trim the ingredient value; treat an empty trimmed value as absent. Reject malformed UUIDs and out-of-range limits with a 400 response.

#### 3. Extend the recipes API

**File**: `src/pages/api/recipes/index.ts`

**Intent**: Preserve the existing list endpoint while adding validated filtering for the search UI.

**Contract**: `GET /api/recipes` accepts optional query parameters such as `ingredient`, repeated `taxonomyId`, and `limit`, and returns `{ data: Recipe[] }` with HTTP 200 for both matches and valid empty results. Keep HTTP 401 for unauthenticated requests, 503 for unavailable Supabase configuration, 400 for invalid query parameters, and 500 for unexpected service failures. A request without filters continues to return the user's newest recipes.

#### 4. Detail read boundary

**Files**: `src/lib/services/recipe.service.ts`, `src/pages/recipes/[id].astro`

**Intent**: Keep the detail flow server-rendered and ownership-safe without adding an API endpoint that has no client consumer in this slice.

**Contract**: The Astro route validates the UUID and calls the service's owned single-recipe method directly. Route-level behavior is covered through the service contract and browser verification: valid owned recipe, controlled not-found, unauthorized isolation, and infrastructure failure state.

### Success Criteria:

#### Automated Verification:

- Service tests cover ingredient-only, taxonomy-only, combined AND, multiple taxonomy IDs, empty filters, no matches, and user isolation.
- API tests or route-level verification cover valid empty results, invalid UUID/limit input, 401, and service failure mapping.
- `npm run typecheck` passes after the service, schema, and API changes.
- `npm run lint` passes for the touched files.

#### Manual Verification:

- `GET /api/recipes` with no filters returns the existing user's recipes.
- A mixed-case, padded ingredient fragment matches the same recipes as its normalized form.
- Combined taxonomy and ingredient filters never return a recipe that satisfies only one condition.
- A valid query with no matches returns HTTP 200 and `{ data: [] }`, not an error.

**Implementation Note**: After automated checks pass, pause for manual API verification before beginning the UI phase.

## Phase 2: Search UI and SSR Recipe Details

### Overview

Turn `/recipes` into the search surface, add reusable result-card and search-control components, and add a server-rendered detail route with explicit loading and failure states.

### Changes Required:

#### 1. Search controls and results island

**File**: `src/components/recipes/RecipeSearch.tsx` (new)

**Intent**: Provide the user workflow for multiple taxonomy selections and ingredient text filtering, with automatic debounced refresh and accessible states.

**Contract**: Accept the initial recipe list and taxonomy/search configuration from the Astro page. Reuse the existing taxonomy autocomplete endpoint and selection model, allow multiple selected tags, debounce ingredient/filter changes, preserve current filters while loading, ignore stale responses, expose a clear/reset action, and render loading, error, empty, and result states. Use `cn()` and the repository's accessible button/input conventions.

#### 2. Result card

**File**: `src/components/recipes/RecipeCard.tsx` (new)

**Intent**: Give every matching recipe a compact, scannable representation and a direct path to its full content.

**Contract**: Render the recipe title, lead fallback, optional photo link or safe placeholder, and a link to `/recipes/<id>` with an accessible name containing the recipe title. Do not expose edit/delete behavior in this slice.

#### 3. Recipe list page integration

**File**: `src/pages/recipes/index.astro`

**Intent**: Keep SSR as the initial render path while handing interactive filtering to a focused React island.

**Contract**: Load the initial owned recipe list through `RecipeService`, render the existing top-level navigation and add-recipe action, mount the search island with the initial data, and retain a server-rendered no-recipes state for the initial empty account. Search results must replace the list area without losing the active filters.

#### 4. SSR recipe detail page

**File**: `src/pages/recipes/[id].astro` (new)

**Intent**: Render a complete owned recipe view through the existing Astro SSR and auth conventions.

**Contract**: Validate the route ID, load the recipe through `RecipeService`, load/display its taxonomy labels through the existing Supabase/service pattern, and render title, lead when present, photo URL when present, ingredients, instructions, and a link back to `/recipes`. Render a controlled not-found response for missing/inaccessible records and a clear service-error response for infrastructure failures; do not leak another user's data.

#### 5. Recipe detail API or service support

**Files**: `src/lib/services/recipe.service.ts`, `src/lib/services/taxonomy.service.ts`, and optionally `src/pages/api/recipes/[id]/index.ts`

**Intent**: Supply the detail page with the recipe and associated taxonomy data using existing ownership-safe boundaries.

**Contract**: The detail read must be account-scoped for the recipe and must not turn shared taxonomy visibility into cross-account recipe visibility. Reuse existing row mapping and typed errors; avoid introducing a second domain model unless the rendered detail requires a clearly named view type.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes after the pages and React island are added.
- `npm run lint` passes for the touched Astro, React, and service files.
- `npm run build` completes successfully with the dynamic SSR route.

#### Manual Verification:

- `/recipes` shows the current recipes and search controls for an authenticated user.
- Selecting multiple taxonomy values narrows results using AND semantics.
- Entering ` KUR ` finds the same recipes as `kur`; ingredient autocomplete is absent by design.
- Loading and empty states are explicit, and clearing filters restores the list.
- Clicking a result opens `/recipes/<id>` and shows the complete recipe.
- A missing or another user's recipe does not reveal content and receives the intended controlled state.

**Implementation Note**: After automated checks pass, pause for manual browser verification of the full search-to-detail flow before beginning the final verification phase.

## Phase 3: Integration, E2E, and Performance Verification

### Overview

Protect the highest-risk behavior at service/API boundaries and verify one complete browser flow, then run the repository quality gates and the MVP search timing check.

### Changes Required:

#### 1. Service integration coverage

**File**: `src/lib/services/__tests__/recipe.service.integration.test.ts` or a focused sibling test file

**Intent**: Lock the search semantics and account isolation at the database boundary.

**Contract**: Fixtures must include recipes that differ by taxonomy membership and ingredient casing/fragments. Assertions must cover one filter, both filters, multiple taxonomy IDs, padded/case-insensitive ingredient queries, no matches, no duplicate results, newest-first ordering, and cross-user exclusion.

#### 2. API/search route coverage

**File**: `src/pages/api/recipes/__tests__/index.test.ts` (new if route tests are supported by the existing setup)

**Intent**: Verify query parsing and HTTP behavior independently from the browser.

**Contract**: Cover repeated taxonomy parameters, default list behavior, valid empty results, malformed UUID/limit 400 responses, unauthenticated 401, and service failure mapping. Keep the response shape `{ data: Recipe[] }` stable.

#### 3. End-to-end search-to-detail scenario

**File**: `tests/seed.spec.ts` or `tests/search-recipes.spec.ts`

**Intent**: Verify the user-visible north-star flow with an authenticated browser and independent fixture names.

**Contract**: Create uniquely named recipes with discriminating taxonomy and ingredient content, apply filters through accessible roles/labels, assert the correct card and empty state, open the result, and assert title plus full detail content. Do not use CSS selectors, XPath, or `page.waitForTimeout()`.

#### 4. Quality and timing gates

**Files**: `package.json`, `context/changes/search-recipes-autocomplete-and-details/plan.md` only if commands need documenting

**Intent**: Confirm the implementation meets repository gates and the roadmap's search performance target without adding speculative schema work.

**Contract**: Run `npx astro sync`, `npm run typecheck`, `npm run lint`, `npm run test:run`, and `npm run build`. Record a representative search timing check against the bounded query; if p95 exceeds 1.5 seconds, stop and plan the smallest evidence-based indexing change rather than silently weakening the contract.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` succeeds.
- `npm run typecheck` succeeds.
- `npm run lint` succeeds.
- `npm run test:run` succeeds with local Supabase available.
- `npm run build` succeeds.
- The selected Playwright scenario passes with the configured authenticated state and dev server.

#### Manual Verification:

- Search by taxonomy only, ingredient only, and both filters behaves as specified.
- Empty results are clearly distinct from service errors.
- Recipe details are complete, readable, and cannot cross account boundaries.
- Search timing is acceptable against the p95 <= 1.5s roadmap target for the representative MVP fixture set.

**Implementation Note**: After this phase's automated and manual checks pass, the S-02 implementation is ready for review; update the Progress section with the actual commit SHA when work lands.

## Testing Strategy

### Unit Tests:

No isolated unit-only search algorithm is required; the correctness risk is the Supabase query and RLS boundary. Keep normalization and query parsing assertions close to the service/API tests.

### Integration Tests:

Use the existing `createTestContext()` fixture and cleanup pattern. Assert the oracle set for each filter combination rather than only checking result counts, because duplicate joins and accidental OR semantics can otherwise pass shallow tests.

### Manual Testing Steps:

1. Seed or create at least three owned recipes: one matching taxonomy A and ingredient fragment, one matching only taxonomy A, and one matching only the ingredient.
2. Select taxonomy A and enter the ingredient fragment; confirm only the intersection appears.
3. Select a second taxonomy tag; confirm only recipes carrying both tags remain.
4. Change casing and add surrounding spaces to the ingredient query; confirm identical results.
5. Enter a non-matching fragment; confirm HTTP-success empty-state behavior in the UI, then clear filters and confirm the list returns.
6. Open a result and confirm title, lead, photo link when present, ingredients, instructions, taxonomy labels, and back navigation.

## Performance Considerations

Use the existing user, relation, and taxonomy indexes and a bounded newest-first result set. The ingredient predicate is a substring search over unstructured text, so measure it against representative data. Do not add a trigram or full-text migration unless the measured p95 misses 1.5 seconds; any such migration would be a separately reviewed performance change.

## Migration Notes

No migration is expected for the selected MVP approach. The existing recipes and recipe-taxonomy schema, indexes, foreign keys, and RLS policies remain the source of truth. If performance evidence requires an index, add it as a separate, reversible migration and update the plan before implementation proceeds.

## References

- Frame brief: `context/changes/_search-recipes-autocomplete-and-details/frame.md`
- Roadmap: `context/foundation/roadmap.md` (S-02)
- Existing recipe service: `src/lib/services/recipe.service.ts`
- Existing taxonomy autocomplete: `src/lib/services/taxonomy.service.ts`
- Existing recipe list page: `src/pages/recipes/index.astro`
- Existing API contract: `src/pages/api/recipes/index.ts`
- Integration fixtures: `src/lib/services/__tests__/helpers.ts`
- Existing browser flow: `tests/seed.spec.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Search Service and API Contract

#### Automated

- [x] 1.1 Service tests cover all filter combinations, normalization, ordering, duplicates, and user isolation — 9e31bc5
- [x] 1.2 API tests cover query validation, empty results, auth, and error mapping — 9e31bc5
- [x] 1.3 `npm run typecheck` passes after service, schema, and API changes — 9e31bc5
- [x] 1.4 `npm run lint` passes for Phase 1 files — 9e31bc5

#### Manual

- [x] 1.5 API behavior is verified manually for filtered, empty, and invalid queries — 9e31bc5

### Phase 2: Search UI and SSR Recipe Details

#### Automated

- [x] 2.1 `npm run typecheck` passes after UI and detail route changes
- [x] 2.2 `npm run lint` passes for Phase 2 files
- [x] 2.3 `npm run build` succeeds with the dynamic SSR route

#### Manual

- [x] 2.4 Search controls, debounce, loading, empty, error, and clear states are verified in the browser
- [x] 2.5 Search result navigation and complete recipe details are verified in the browser
- [x] 2.6 Missing or inaccessible recipe details show the intended controlled state

### Phase 3: Integration, E2E, and Performance Verification

#### Automated

- [ ] 3.1 `npx astro sync` succeeds
- [ ] 3.2 `npm run typecheck` succeeds
- [ ] 3.3 `npm run lint` succeeds
- [ ] 3.4 `npm run test:run` succeeds with local Supabase
- [ ] 3.5 `npm run build` succeeds
- [ ] 3.6 Selected Playwright search-to-detail scenario passes

#### Manual

- [ ] 3.7 Full search semantics and empty/error distinction are verified
- [ ] 3.8 Detail ownership boundary and content completeness are verified
- [ ] 3.9 Representative search timing meets the p95 <= 1.5s target
