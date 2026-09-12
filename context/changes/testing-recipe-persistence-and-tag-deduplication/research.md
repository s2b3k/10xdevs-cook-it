---
date: 2026-09-12T22:42:04.7427356+02:00
researcher: GitHub Copilot
git_commit: 657e2a8e445ab8720420d2e77576361e12ac459b
branch: main
repository: 10xdevs
topic: "Phase 2: Recipe persistence and tag deduplication"
tags: [research, codebase, recipes, taxonomy, validation, integration-tests]
status: complete
last_updated: 2026-09-12
last_updated_by: GitHub Copilot
---

# Research: Recipe persistence and tag deduplication

**Date**: 2026-09-12T22:42:04.7427356+02:00  
**Researcher**: GitHub Copilot  
**Git Commit**: 657e2a8e445ab8720420d2e77576361e12ac459b  
**Branch**: main  
**Repository**: 10xdevs

## Research Question

How should rollout Phase 2 prove recipe persistence, canonical taxonomy creation, partial tag-assignment behavior, and server-side rejection of invalid input for risks R1, R2, and R4?

## Summary

Recipe creation and tag assignment are separate operations. `POST /api/recipes` persists the recipe first, then the client assigns each selected taxonomy through separate `POST /api/recipes/:id/taxonomy` requests. A tag assignment can therefore fail after the recipe exists; the current UI records failed tag names and redirects with a warning query parameter. Phase 2 needs an API/service integration test that makes this partial result observable rather than asserting only successful creation.

Taxonomy creation already uses the database as the source of truth. The service trims values, inserts the taxonomy, and on PostgreSQL uniqueness error `23505` reads the existing row back. The database expression index on lowercase name and category prevents equivalent records. Tests must exercise two equivalent writes and verify the same ID plus unchanged row count; a normalizer-only test is insufficient.

Server schemas cover required recipe fields, taxonomy creation, taxonomy assignment, update payloads, and search parameters. Malformed JSON, missing fields, wrong types, and invalid UUIDs have route-level handling. Unknown object keys are currently stripped by Zod's default object behavior, not rejected. R4 should make that behavior an explicit tested API contract or change the schemas to strict mode before asserting rejection.

## Detailed Findings

### R1: Canonical taxonomy creation and deduplication

- [taxonomy.service.ts](src/lib/services/taxonomy.service.ts) trims `name` and `category`, inserts the taxonomy, and handles `23505` by querying the existing case-insensitive match.
- [20260526110002_create_taxonomy.sql](supabase/migrations/20260526110002_create_taxonomy.sql) defines a unique expression index over `lower(name)` and `coalesce(lower(category), '')`. This is the database guarantee that equivalent values cannot create another row.
- [20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql) uses `(recipe_id, taxonomy_id)` as the relation primary key, so duplicate edges are also rejected.
- [20260912100001_add_recipe_update_transaction.sql](supabase/migrations/20260912100001_add_recipe_update_transaction.sql) groups taxonomy IDs before inserting relations during atomic recipe updates. [recipe.service.ts](src/lib/services/recipe.service.ts) also removes duplicate IDs before calling the RPC.

Required proof:

1. Create a taxonomy through the service or API.
2. Create it again with equivalent case and surrounding whitespace, and assert the same taxonomy ID.
3. Query with the admin test client and assert the taxonomy row count did not increase.
4. Where relation behavior is in scope, assert duplicate taxonomy IDs produce one relation.

The existing integration suite covers some relation deduplication and update normalization, but does not directly prove `createOrGetTaxonomy()` conflict behavior, row-count stability, or the API's `201` versus `200` result signal.

### R2: Recipe persistence and partial tag assignment

- [src/pages/api/recipes/index.ts](src/pages/api/recipes/index.ts) validates and creates the recipe, returning `201` with the created recipe.
- [src/pages/api/recipes/[id]/taxonomy.ts](src/pages/api/recipes/%5Bid%5D/taxonomy.ts) validates one taxonomy assignment and calls `assignTaxonomy()`.
- [src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts) inserts each relation independently; there is no transaction covering the initial recipe request and the subsequent assignment requests.
- [src/components/recipes/AddRecipeForm.tsx](src/components/recipes/AddRecipeForm.tsx) loops over selected tags, collects failed tag names, and redirects with a warning when the recipe was saved but one or more assignments failed.
- [src/lib/services/recipe.errors.ts](src/lib/services/recipe.errors.ts) maps database conflict, integrity, authorization, and not-found errors into domain responses.

The observable contract is partial success: the recipe remains persisted, successful assignments remain persisted, and a failed assignment produces a user-visible warning. The test should force a realistic assignment failure, assert the response/error, then inspect the database to prove what persisted. A happy-path create test cannot distinguish complete success from silent loss of tags.

### R4: Independent server validation

- [src/lib/schemas/recipe.schemas.ts](src/lib/schemas/recipe.schemas.ts) defines Zod schemas for recipe creation, taxonomy creation, taxonomy assignment, recipe updates, and search.
- Recipe creation and update routes parse JSON, call `safeParse`, and return `400` with field errors for missing, malformed, or incorrectly typed values.
- Taxonomy creation and assignment routes also parse JSON and validate server-side, returning `400` before service persistence on invalid input.
- [src/pages/api/recipes/[id]/index.ts](src/pages/api/recipes/%5Bid%5D/index.ts) validates recipe IDs and maps service/database failures; taxonomy assignment currently checks that the path ID exists but does not independently validate it as a UUID.
- Unknown keys in Zod objects are stripped by default. The current implementation therefore does not reject unexpected fields. This is a contract gap relative to the Phase 2 risk wording and should be settled in the plan.
- Database constraints remain a second line of defense: recipe title has a non-empty trimmed check, taxonomy uniqueness is database-backed, and foreign keys protect recipe-taxonomy relations.

Minimum negative cases for the API/service integration slice:

- missing required recipe or taxonomy fields;
- malformed JSON;
- wrong primitive types and invalid UUIDs;
- whitespace-only required text after server normalization;
- non-existent taxonomy IDs causing a foreign-key failure;
- unexpected keys, with the expected strip-or-reject contract made explicit;
- duplicate taxonomy names and duplicate relation IDs where the database guarantee must be exercised.

## Test Infrastructure and Fixtures

- [vitest.config.ts](vitest.config.ts) runs Node tests matching service and API integration patterns, sequentially, with 30-second test and hook timeouts.
- [helpers.ts](src/lib/services/__tests__/helpers.ts) provides `createTestContext()` with an admin client, two authenticated users, tracked recipes/taxonomies/relations, and cleanup in dependency order.
- [recipe.service.integration.test.ts](src/lib/services/__tests__/recipe.service.integration.test.ts) is the established service integration seam for ownership, relation integrity, and update behavior.
- [recipe-mutation-api.spec.ts](tests/recipe-mutation-api.spec.ts) uses Playwright's authenticated HTTP request client for route-level CRUD checks. Phase 2 can use the existing Vitest API integration patterns where route construction is available, or extend the current API request style for true HTTP coverage.
- Local Supabase must be running and `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must be available for persistence tests.

## Architecture Insights

The write path intentionally separates recipe content persistence from taxonomy relation writes. Recipe updates have an atomic database RPC, but initial creation plus tag assignment remains client-coordinated. Database constraints are the authoritative protection for taxonomy identity and relation uniqueness; service normalization improves input consistency but cannot replace those constraints. API tests should assert observable status/error contracts and use an independent admin read to verify persisted state.

## Historical Context

- [context/foundation/test-plan.md](context/foundation/test-plan.md) defines Phase 2, risks R1/R2/R4, and the anti-patterns this research addresses.
- [context/archive/2026-09-10-testing-foundation-and-data-protection/plan.md](context/archive/2026-09-10-testing-foundation-and-data-protection/plan.md) establishes the existing integration-test foundation and data-protection conventions.
- [context/archive/2026-09-12-edit-and-delete-recipe/plan.md](context/archive/2026-09-12-edit-and-delete-recipe/plan.md) documents the transactional update boundary that differs from initial recipe creation.

## Code References

- [src/pages/api/recipes/index.ts](src/pages/api/recipes/index.ts) - recipe creation API validation and persistence boundary.
- [src/pages/api/recipes/[id]/taxonomy.ts](src/pages/api/recipes/%5Bid%5D/taxonomy.ts) - per-taxonomy assignment API.
- [src/lib/services/taxonomy.service.ts](src/lib/services/taxonomy.service.ts) - taxonomy normalization and conflict lookup.
- [src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts) - recipe and relation service operations.
- [src/lib/schemas/recipe.schemas.ts](src/lib/schemas/recipe.schemas.ts) - server input schemas.
- [supabase/migrations/20260526110002_create_taxonomy.sql](supabase/migrations/20260526110002_create_taxonomy.sql) - canonical taxonomy uniqueness constraint.
- [src/lib/services/__tests__/helpers.ts](src/lib/services/__tests__/helpers.ts) - integration fixture lifecycle.

## Open Questions

- Should unexpected object keys be rejected with strict schemas, or should their current strip behavior be the documented API contract?
- Should Phase 2 test the route handlers through a running HTTP server, the service boundary with Supabase, or both for the highest-signal cases?
- Does the partial-assignment test need to assert the exact redirect warning text, or only the persisted state and failure signal?
- Should initial recipe creation and tag assignment remain non-atomic, or is a future product change expected to move them behind one server transaction?
