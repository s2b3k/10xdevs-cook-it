create index if not exists recipes_user_id_idx
  on public.recipes (user_id);

create index if not exists recipes_created_at_idx
  on public.recipes (created_at desc);

create index if not exists recipe_taxonomy_recipe_id_idx
  on public.recipe_taxonomy (recipe_id);

create index if not exists recipe_taxonomy_taxonomy_id_idx
  on public.recipe_taxonomy (taxonomy_id);

create index if not exists taxonomy_category_name_idx
  on public.taxonomy (category, name);
