---
date: 2026-09-10T13:23:19.1607900+02:00
researcher: GitHub Copilot
git_commit: 5ba75d8368b12f72f7e4db5cfc1ecbe338ec39e1
branch: lesson/m3l1
repository: 10xdevs
topic: "Testing foundation and data protection"
tags: [research, codebase, supabase, rls, recipes, taxonomy]
status: complete
last_updated: 2026-09-10
last_updated_by: GitHub Copilot
---

# Research: Testing foundation and data protection

**Date**: 2026-09-10T13:23:19.1607900+02:00
**Researcher**: GitHub Copilot
**Git Commit**: 5ba75d8368b12f72f7e4db5cfc1ecbe338ec39e1
**Branch**: lesson/m3l1
**Repository**: 10xdevs

## Research Question

Determine the code paths, database guarantees, and smallest viable test foundation for rollout Phase 1: integration tests with Supabase/RLS covering R3 (cross-account recipe and relation isolation) and R5 (recipe-taxonomy referential and uniqueness integrity).

## Summary

The application has two protection layers for recipe ownership: service-level `user_id` filters and Supabase RLS. Recipe-taxonomy ownership is transitive: the join table has no `user_id`; its policies check that the referenced recipe belongs to `auth.uid()`. Taxonomy itself is intentionally shared and writable by authenticated users.

The database already provides the core R5 guarantees: composite primary-key uniqueness for a recipe-taxonomy pair, foreign keys, `ON DELETE CASCADE` from recipes, and `ON DELETE RESTRICT` from taxonomy. The service maps database errors to domain codes, but the taxonomy-assignment API currently turns every service error into HTTP 500, so tests should assert both the domain error and the current HTTP contract, while making any desired status-code correction a separate implementation decision.

There is no test runner, test configuration, test file, or CI test command. The smallest viable foundation is a Node-environment Vitest suite using the existing Supabase client against local Supabase. Docker and authenticated test users are prerequisites for meaningful RLS assertions.

## Detailed Findings

### Authentication and recipe ownership

- Middleware resolves the request user with Supabase and stores it in `context.locals.user` ([src/middleware.ts](src/middleware.ts#L1-L20)).
- Recipe API routes reject unauthenticated requests and construct the service with `user.id` ([src/pages/api/recipes/index.ts](src/pages/api/recipes/index.ts#L1-L85)).
- Recipe list, update, and delete operations add an explicit `.eq("user_id", userId)` filter in addition to RLS ([src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts#L75-L144)).
- Recipe insert sets `user_id` from the service constructor, while the database policy also requires `auth.uid() = user_id` ([src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts#L55-L75), [supabase/migrations/20260526110004_enable_rls_and_policies.sql](supabase/migrations/20260526110004_enable_rls_and_policies.sql#L1-L32)).

### Transitive relation authorization

- `recipe_taxonomy` uses a composite primary key and has no direct account column ([supabase/migrations/20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql#L1-L9)).
- Its select, insert, and delete policies use an `EXISTS` query against `recipes` to require ownership of the referenced recipe ([supabase/migrations/20260526110004_enable_rls_and_policies.sql](supabase/migrations/20260526110004_enable_rls_and_policies.sql#L34-L61)).
- `assignTaxonomy` has no application-level owner lookup and relies on the RLS policy ([src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts#L146-L173)). This is an important boundary for an integration test: use two authenticated clients and attempt assignment against the other account's recipe.
- No `UPDATE` policy exists for `recipe_taxonomy`. The current model treats relations as insert/delete records; any future relation update would need an explicit policy.
- Taxonomy is a shared resource: authenticated users can read and write it under the current policies ([supabase/migrations/20260526110004_enable_rls_and_policies.sql](supabase/migrations/20260526110004_enable_rls_and_policies.sql#L62-L72)). Cross-account tests should therefore assert recipe and relation isolation, not taxonomy ownership.

### Database integrity guarantees

- Recipes reference `auth.users` with `ON DELETE CASCADE` ([supabase/migrations/20260526110001_create_recipes.sql](supabase/migrations/20260526110001_create_recipes.sql#L1-L30)).
- Taxonomy has a case-insensitive name/category uniqueness index using `lower(name)` and `coalesce(lower(category), '')` ([supabase/migrations/20260526110002_create_taxonomy.sql](supabase/migrations/20260526110002_create_taxonomy.sql#L1-L18)).
- The relation foreign key to recipes cascades on recipe deletion; the taxonomy foreign key uses `ON DELETE RESTRICT` ([supabase/migrations/20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql#L1-L9)).
- Duplicate relation inserts fail with `23505`; missing recipe or taxonomy references fail with `23503`. The service maps these to `RECIPE_CONFLICT` and `RECIPE_INTEGRITY`, while RLS failures map from `42501` to `RECIPE_UNAUTHORIZED` ([src/lib/services/recipe.errors.ts](src/lib/services/recipe.errors.ts#L1-L37)).
- The taxonomy conflict fallback searches by name only, although the database uniqueness key includes category ([src/lib/services/taxonomy.service.ts](src/lib/services/taxonomy.service.ts#L36-L66)). Category-sensitive tests should expose this behavior before relying on it as canonical.

### API and error behavior

- The taxonomy assignment endpoint validates the request and delegates to the service ([src/pages/api/recipes/[id]/taxonomy.ts](src/pages/api/recipes/[id]/taxonomy.ts#L1-L39)).
- Its catch block currently serializes all service errors as HTTP 500 ([src/pages/api/recipes/[id]/taxonomy.ts](src/pages/api/recipes/[id]/taxonomy.ts#L38-L46)), despite domain mappings that distinguish unauthorized, conflict, integrity, and not-found cases. This is a known contract gap to document in tests, not silently normalize in the test expectations.
- Recipe creation and taxonomy assignment are separate persistence operations. A tag assignment can fail after the recipe exists, and the UI displays a warning rather than rolling back the recipe ([context/changes/add-recipe-with-taxonomy/plan.md](context/changes/add-recipe-with-taxonomy/plan.md#L76-L100), [context/changes/add-recipe-with-taxonomy/reviews/impl-review.md](context/changes/add-recipe-with-taxonomy/reviews/impl-review.md#L41-L57)). This is outside R3/R5's core boundary but matters for cleanup and fixture design.

### Test infrastructure and environment

- `package.json` has no Vitest, Jest, Mocha, Playwright, test script, or test configuration ([package.json](package.json#L1-L50)). No test files were found.
- CI currently runs dependency installation, Astro sync, lint, and build, but no tests ([.github/workflows/ci.yml](.github/workflows/ci.yml#L1-L30)).
- Local Supabase is configured for API port `54321` and database port `54322` ([supabase/config.toml](supabase/config.toml#L1-L45)); `npx supabase start` requires Docker.
- The existing TypeScript and Supabase client stack supports a Node-environment Vitest suite without browser automation. Authenticated clients must carry real test-user sessions; a service-role client must not be used for RLS assertions because it bypasses the boundary being tested.

## Recommended Phase 1 Test Matrix

| Area                   | Setup and action                                                | Assertion that provides signal                                                         |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| R3 read isolation      | User A creates a recipe; User B lists/reads recipes             | B cannot observe A's recipe, and the response does not leak its relation rows          |
| R3 mutation isolation  | B updates or deletes A's recipe                                 | Operation cannot change or remove A's row; assert the actual domain/API error contract |
| R3 relation isolation  | B assigns or deletes a taxonomy relation for A's recipe         | RLS blocks the relation mutation and no relation is created or removed                 |
| R5 duplicate relation  | Assign the same taxonomy twice to one recipe                    | Second operation produces the conflict path; exactly one relation remains              |
| R5 missing references  | Assign a fake recipe or taxonomy ID                             | Operation fails with integrity mapping and leaves no relation                          |
| R5 recipe cascade      | Assign relations, then delete the recipe                        | Recipe and its relations disappear; taxonomy rows remain                               |
| R5 taxonomy restrict   | Assign a taxonomy, then attempt to delete the taxonomy directly | Delete is rejected and the existing relation remains                                   |
| R5 category uniqueness | Create equal names in same and different categories             | Same normalized tuple resolves to one record; different categories remain distinct     |

Assertions must inspect the resulting rows and error codes, not only HTTP success or row existence. Each test should clean up its users, recipes, relations, and shared taxonomy fixtures, or use unique names to avoid cross-test contamination.

## Code References

- [src/middleware.ts](src/middleware.ts#L1-L20) - request identity resolution.
- [src/lib/services/recipe.service.ts](src/lib/services/recipe.service.ts#L55-L173) - recipe ownership filters and relation assignment.
- [src/lib/services/recipe.errors.ts](src/lib/services/recipe.errors.ts#L1-L37) - Supabase-to-domain error mapping.
- [src/lib/services/taxonomy.service.ts](src/lib/services/taxonomy.service.ts#L36-L66) - taxonomy conflict fallback.
- [src/pages/api/recipes/index.ts](src/pages/api/recipes/index.ts#L1-L85) - authenticated recipe API flow.
- [src/pages/api/recipes/[id]/taxonomy.ts](src/pages/api/recipes/[id]/taxonomy.ts#L1-L46) - relation API and current error response.
- [supabase/migrations/20260526110001_create_recipes.sql](supabase/migrations/20260526110001_create_recipes.sql#L1-L30) - recipe schema.
- [supabase/migrations/20260526110002_create_taxonomy.sql](supabase/migrations/20260526110002_create_taxonomy.sql#L1-L18) - taxonomy uniqueness.
- [supabase/migrations/20260526110003_create_recipe_taxonomy.sql](supabase/migrations/20260526110003_create_recipe_taxonomy.sql#L1-L9) - relation keys and delete behavior.
- [supabase/migrations/20260526110004_enable_rls_and_policies.sql](supabase/migrations/20260526110004_enable_rls_and_policies.sql#L1-L73) - RLS policies.
- [package.json](package.json#L1-L50) - current scripts and dependencies.
- [.github/workflows/ci.yml](.github/workflows/ci.yml#L1-L30) - current CI gates.

## Architecture Insights

Authorization is intentionally defense-in-depth: API authentication and service-scoped user IDs provide application-level boundaries, while Supabase RLS is the authoritative database boundary. The join table demonstrates transitive authorization through a foreign-key relationship rather than duplicating `user_id`.

The shared taxonomy model is separate from account-owned recipes. A test that treats taxonomy as account-owned would encode the wrong product contract. Phase 1 should keep its assertions at the recipe and relation boundary, while verifying that shared taxonomy rows can be referenced by an authorized owner.

## Historical Context (from prior changes)

- [context/changes/add-recipe-with-taxonomy/plan.md](context/changes/add-recipe-with-taxonomy/plan.md#L76-L100) established the JSON API flow and separate recipe/tag persistence steps.
- [context/changes/add-recipe-with-taxonomy/reviews/impl-review.md](context/changes/add-recipe-with-taxonomy/reviews/impl-review.md#L41-L57) records the accepted partial-failure behavior: a recipe may persist while a tag assignment fails, with a warning shown to the user.
- [context/changes/recipe-domain-foundation/plan.md](context/changes/recipe-domain-foundation/plan.md#L1-L120) is the earlier domain-foundation plan associated with the recipe and taxonomy schema.

## Related Research

No other `research.md` artifacts were present under the active change folders or archive when this research was performed.

## Open Questions

- Should the assignment API translate `RECIPE_UNAUTHORIZED`, `RECIPE_CONFLICT`, and `RECIPE_INTEGRITY` into 403/409/400 responses now, or should Phase 1 preserve and document the current 500 contract?
- Should the test harness create users through Supabase Auth APIs or use a local-only fixture mechanism, and how will authenticated session tokens be isolated between tests?
- Should the taxonomy conflict fallback be corrected to include category before category-sensitive tests become a required contract?
- How will local Supabase integration tests be provisioned in CI? The current Phase 1 environment assumes Docker locally; CI wiring is assigned to the later quality-gates phase.
