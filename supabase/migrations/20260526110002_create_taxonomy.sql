create table if not exists public.taxonomy (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  category text,
  created_at timestamptz not null default now()
);

create unique index if not exists taxonomy_name_category_unique_idx
  on public.taxonomy (lower(name), coalesce(lower(category), ''));
