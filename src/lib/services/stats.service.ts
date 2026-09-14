import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserStats, UUID } from "@/types";

export interface StatsService {
  getUserStats(): Promise<UserStats>;
}

export function createStatsService(supabase: SupabaseClient, userId: UUID): StatsService {
  async function getUserStats(): Promise<UserStats> {
    const { count: recipeCount, error: recipeError } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (recipeError) {
      throw recipeError;
    }

    const totalRecipes = recipeCount ?? 0;
    if (totalRecipes === 0) {
      return {
        recipeCount: 0,
        taxonomyCount: 0,
      };
    }

    const { data: recipes, error: listError } = await supabase.from("recipes").select("id").eq("user_id", userId);

    if (listError) {
      throw listError;
    }

    const recipeIds = recipes.map((r: { id: string }) => r.id);
    if (recipeIds.length === 0) {
      return {
        recipeCount: totalRecipes,
        taxonomyCount: 0,
      };
    }

    const { data: recipeTaxonomies, error: taxonomyError } = await supabase
      .from("recipe_taxonomy")
      .select("taxonomy_id")
      .in("recipe_id", recipeIds);

    if (taxonomyError) {
      throw taxonomyError;
    }

    const uniqueTaxonomyIds = new Set(recipeTaxonomies.map((rt: { taxonomy_id: string }) => rt.taxonomy_id));

    return {
      recipeCount: totalRecipes,
      taxonomyCount: uniqueTaxonomyIds.size,
    };
  }

  return {
    getUserStats,
  };
}
