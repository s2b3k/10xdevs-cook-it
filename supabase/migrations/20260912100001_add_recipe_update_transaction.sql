create or replace function public.update_recipe_with_taxonomy(
  p_recipe_id uuid,
  p_title text,
  p_lead text,
  p_ingredients text,
  p_instructions text,
  p_photo_url text,
  p_taxonomy_ids uuid[]
)
returns public.recipes
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_recipe public.recipes;
begin
  update public.recipes
  set
    title = p_title,
    lead = p_lead,
    ingredients = p_ingredients,
    instructions = p_instructions,
    photo_url = p_photo_url
  where id = p_recipe_id
    and user_id = auth.uid()
  returning * into updated_recipe;

  if not found then
    raise exception 'Recipe was not found.' using errcode = 'PGRST116';
  end if;

  delete from public.recipe_taxonomy
  where recipe_id = p_recipe_id;

  insert into public.recipe_taxonomy (recipe_id, taxonomy_id)
  select p_recipe_id, taxonomy_id
  from unnest(coalesce(p_taxonomy_ids, '{}'::uuid[])) as taxonomy_ids(taxonomy_id)
  group by taxonomy_id;

  return updated_recipe;
end;
$$;
