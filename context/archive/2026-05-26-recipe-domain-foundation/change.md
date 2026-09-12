---
change_id: recipe-domain-foundation
title: Fundament F-01 z roadmapy cook.it
status: archived
created: 2026-05-26
updated: 2026-09-12
archived_at: 2026-09-12T14:33:59Z
---

## Notes

F-01 z Roadmap: cook.it — DONE (all 3 phases).

### Delivered

- `supabase/migrations/` — 5 migrations: recipes table, taxonomy table, recipe_taxonomy join table, RLS policies (ownership for recipes/joins, authenticated read/write for taxonomy), core indexes.
- `supabase/migrations/README.md` — migration sequence and dependency notes.
- `src/types.ts` — shared domain types: Recipe, Taxonomy, RecipeTaxonomy, CreateRecipeInput, UpdateRecipeInput, CreateTaxonomyInput, AssignTaxonomyInput.
- `src/lib/services/recipe.errors.ts` — unified domain error model: RECIPE_ERROR_CODES, RecipeDomainError, mapSupabaseError().
- `src/lib/services/recipe.service.ts` — service factory createRecipeService(supabase, userId) with createRecipe, listRecipes, updateRecipe, deleteRecipe, assignTaxonomy.

### Verification

- `npm run lint` — clean (repo-wide CRLF normalized in Phase 1 commit deb0a5c).
- `npm run build` — passes.
- Cloud migration dry-run — all 5 migrations validated against linked project soaridjjkbyyommgsuvz.
- Manual: ownership RLS, taxonomy RESTRICT on delete, domain error propagation — all confirmed.

### Handoff readiness for S-01

- Stable contracts: CreateRecipeInput / UpdateRecipeInput / AssignTaxonomyInput in src/types.ts; RecipeService interface in recipe.service.ts.
- Out of scope for F-01: search/filter, photo upload, pagination, tag management UI.
- No open decisions blocking S-01 start. Run `npx supabase db push --linked` against the target environment to apply migrations before integrating.
