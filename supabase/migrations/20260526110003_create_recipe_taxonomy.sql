create table if not exists public.recipe_taxonomy (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  taxonomy_id uuid not null references public.taxonomy (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (recipe_id, taxonomy_id)
);
