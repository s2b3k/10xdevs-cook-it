import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTaxonomyInput, Taxonomy } from "@/types";

interface TaxonomyRow {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

function toTaxonomy(row: TaxonomyRow): Taxonomy {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    createdAt: row.created_at,
  };
}

export interface TaxonomyService {
  searchTaxonomy(query: string, limit?: number): Promise<Taxonomy[]>;
  createOrGetTaxonomy(input: CreateTaxonomyInput): Promise<{ taxonomy: Taxonomy; isNew: boolean }>;
}

export function createTaxonomyService(supabase: SupabaseClient): TaxonomyService {
  async function searchTaxonomy(query: string, limit = 20): Promise<Taxonomy[]> {
    const base = supabase.from("taxonomy").select("id, name, category, created_at").order("name").limit(limit);

    const finalQuery = query.trim() ? base.ilike("name", `%${query.trim()}%`) : base;

    const { data, error } = await finalQuery.overrideTypes<TaxonomyRow[], { merge: false }>();

    if (error) {
      throw new Error(error.message);
    }

    return data.map(toTaxonomy);
  }

  async function createOrGetTaxonomy(input: CreateTaxonomyInput): Promise<{ taxonomy: Taxonomy; isNew: boolean }> {
    const name = input.name.trim();
    const category = input.category?.trim() ?? null;

    const { data: inserted, error: insertError } = await supabase
      .from("taxonomy")
      .insert({ name, category })
      .select("id, name, category, created_at")
      .single<TaxonomyRow>();

    if (!insertError) {
      return { taxonomy: toTaxonomy(inserted), isNew: true };
    }

    // On unique conflict (23505), fetch the existing record
    if (insertError.code === "23505") {
      const { data: existing, error: selectError } = await supabase
        .from("taxonomy")
        .select("id, name, category, created_at")
        .ilike("name", name)
        .limit(1)
        .maybeSingle<TaxonomyRow>();

      if (selectError) {
        throw new Error(selectError.message);
      }

      if (!existing) {
        throw new Error(`Taxonomy '${name}' could not be created or found.`);
      }

      return { taxonomy: toTaxonomy(existing), isNew: false };
    }

    throw new Error(insertError.message);
  }

  return { searchTaxonomy, createOrGetTaxonomy };
}
