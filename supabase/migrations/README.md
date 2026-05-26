# F-01 migration sequence

This folder contains the Recipe Domain Foundation (F-01) migrations.

Order is important:

1. `20260526110001_create_recipes.sql` - creates `public.recipes` with ownership and update trigger.
2. `20260526110002_create_taxonomy.sql` - creates shared `public.taxonomy` dictionary.
3. `20260526110003_create_recipe_taxonomy.sql` - creates many-to-many join table and FK integrity.
4. `20260526110004_enable_rls_and_policies.sql` - enables RLS and ownership policies.
5. `20260526110005_add_core_indexes.sql` - adds core indexes for ownership and taxonomy filters.

The sequence is intentionally incremental: schema first, then access control, then performance indexes.
