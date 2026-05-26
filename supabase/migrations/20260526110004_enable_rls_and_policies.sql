alter table public.recipes enable row level security;
alter table public.recipe_taxonomy enable row level security;
alter table public.taxonomy enable row level security;

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own"
  on public.recipes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own"
  on public.recipes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own"
  on public.recipes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own"
  on public.recipes
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "recipe_taxonomy_select_own" on public.recipe_taxonomy;
create policy "recipe_taxonomy_select_own"
  on public.recipe_taxonomy
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_taxonomy.recipe_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_taxonomy_insert_own" on public.recipe_taxonomy;
create policy "recipe_taxonomy_insert_own"
  on public.recipe_taxonomy
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_taxonomy.recipe_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_taxonomy_delete_own" on public.recipe_taxonomy;
create policy "recipe_taxonomy_delete_own"
  on public.recipe_taxonomy
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_taxonomy.recipe_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "taxonomy_read_authenticated" on public.taxonomy;
create policy "taxonomy_read_authenticated"
  on public.taxonomy
  for select
  to authenticated
  using (true);

drop policy if exists "taxonomy_write_authenticated" on public.taxonomy;
create policy "taxonomy_write_authenticated"
  on public.taxonomy
  for all
  to authenticated
  using (true)
  with check (true);
