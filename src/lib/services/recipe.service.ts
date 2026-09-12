import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateRecipeInput,
  Recipe,
  SearchRecipesInput,
  Taxonomy,
  UpdateRecipeInput,
  UpdateRecipeWithTaxonomyInput,
  UUID,
} from "@/types";
import { RECIPE_ERROR_CODES, RecipeDomainError, mapSupabaseError } from "@/lib/services/recipe.errors";

interface RecipeRow {
  id: string;
  user_id: string;
  title: string;
  lead: string | null;
  ingredients: string;
  instructions: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface RecipeTaxonomyRow {
  recipe_id: string;
  taxonomy_id: string;
}

interface RecipeTaxonomyWithTaxonomyRow {
  taxonomy: {
    id: string;
    name: string;
    category: string | null;
    created_at: string;
  } | null;
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    lead: row.lead,
    ingredients: row.ingredients,
    instructions: row.instructions,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new RecipeDomainError(RECIPE_ERROR_CODES.validation, `${fieldName} must not be empty.`, {
      fieldName,
    });
  }
  return normalized;
}

export interface RecipeService {
  createRecipe(input: CreateRecipeInput): Promise<Recipe>;
  listRecipes(): Promise<Recipe[]>;
  searchRecipes(input?: SearchRecipesInput): Promise<Recipe[]>;
  getRecipe(recipeId: UUID): Promise<Recipe>;
  listTaxonomiesForRecipe(recipeId: UUID): Promise<Taxonomy[]>;
  updateRecipe(recipeId: UUID, input: UpdateRecipeInput): Promise<Recipe>;
  updateRecipeWithTaxonomy(recipeId: UUID, input: UpdateRecipeWithTaxonomyInput): Promise<Recipe>;
  deleteRecipe(recipeId: UUID): Promise<void>;
  assignTaxonomy(recipeId: UUID, taxonomyId: UUID): Promise<void>;
}

export function createRecipeService(supabase: SupabaseClient, userId: UUID): RecipeService {
  async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
    const payload = {
      user_id: userId,
      title: normalizeRequiredText(input.title, "title"),
      lead: normalizeOptionalText(input.lead),
      ingredients: normalizeRequiredText(input.ingredients, "ingredients"),
      instructions: normalizeRequiredText(input.instructions, "instructions"),
      photo_url: normalizeOptionalText(input.photoUrl),
    };

    const { data, error } = await supabase
      .from("recipes")
      .insert(payload)
      .select("id, user_id, title, lead, ingredients, instructions, photo_url, created_at, updated_at")
      .single<RecipeRow>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.unknown) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.unknown, error.message, error)
      );
    }

    return toRecipe(data);
  }

  async function listRecipes(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, user_id, title, lead, ingredients, instructions, photo_url, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .overrideTypes<RecipeRow[], { merge: false }>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.unknown) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.unknown, error.message, error)
      );
    }

    return data.map(toRecipe);
  }

  async function searchRecipes(input: SearchRecipesInput = {}): Promise<Recipe[]> {
    const ingredient = input.ingredient?.trim() ?? undefined;
    const taxonomyIds = [...new Set(input.taxonomyIds ?? [])];
    const limit = input.limit ?? 20;

    let matchingRecipeIds: string[] | undefined;
    if (taxonomyIds.length > 0) {
      const { data: relations, error: relationError } = await supabase
        .from("recipe_taxonomy")
        .select("recipe_id, taxonomy_id")
        .in("taxonomy_id", taxonomyIds)
        .overrideTypes<RecipeTaxonomyRow[], { merge: false }>();

      if (relationError) {
        throw (
          mapSupabaseError(relationError, RECIPE_ERROR_CODES.unknown) ??
          new RecipeDomainError(RECIPE_ERROR_CODES.unknown, relationError.message, relationError)
        );
      }

      const taxonomyCountByRecipe = new Map<string, Set<string>>();
      for (const relation of relations) {
        const recipeTaxonomies = taxonomyCountByRecipe.get(relation.recipe_id) ?? new Set<string>();
        recipeTaxonomies.add(relation.taxonomy_id);
        taxonomyCountByRecipe.set(relation.recipe_id, recipeTaxonomies);
      }

      matchingRecipeIds = [...taxonomyCountByRecipe.entries()]
        .filter(([, recipeTaxonomies]) => taxonomyIds.every((taxonomyId) => recipeTaxonomies.has(taxonomyId)))
        .map(([recipeId]) => recipeId);

      if (matchingRecipeIds.length === 0) {
        return [];
      }
    }

    let query = supabase
      .from("recipes")
      .select("id, user_id, title, lead, ingredients, instructions, photo_url, created_at, updated_at")
      .eq("user_id", userId);

    if (matchingRecipeIds) {
      query = query.in("id", matchingRecipeIds);
    }
    if (ingredient) {
      query = query.ilike("ingredients", `%${ingredient}%`);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit)
      .overrideTypes<RecipeRow[], { merge: false }>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.unknown) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.unknown, error.message, error)
      );
    }

    return data.map(toRecipe);
  }

  async function getRecipe(recipeId: UUID): Promise<Recipe> {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, user_id, title, lead, ingredients, instructions, photo_url, created_at, updated_at")
      .eq("id", recipeId)
      .eq("user_id", userId)
      .single<RecipeRow>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.notFound) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.notFound, error.message, error)
      );
    }

    return toRecipe(data);
  }

  async function listTaxonomiesForRecipe(recipeId: UUID): Promise<Taxonomy[]> {
    const { data, error } = await supabase
      .from("recipe_taxonomy")
      .select("taxonomy(id, name, category, created_at)")
      .eq("recipe_id", recipeId)
      .overrideTypes<RecipeTaxonomyWithTaxonomyRow[], { merge: false }>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.unknown) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.unknown, error.message, error)
      );
    }

    return data.flatMap(({ taxonomy }) =>
      taxonomy
        ? [
            {
              id: taxonomy.id,
              name: taxonomy.name,
              category: taxonomy.category,
              createdAt: taxonomy.created_at,
            },
          ]
        : [],
    );
  }

  async function updateRecipe(recipeId: UUID, input: UpdateRecipeInput): Promise<Recipe> {
    const patch: Record<string, string | null> = {};

    if (input.title !== undefined) {
      patch.title = normalizeRequiredText(input.title, "title");
    }
    if (input.lead !== undefined) {
      patch.lead = normalizeOptionalText(input.lead);
    }
    if (input.ingredients !== undefined) {
      patch.ingredients = normalizeRequiredText(input.ingredients, "ingredients");
    }
    if (input.instructions !== undefined) {
      patch.instructions = normalizeRequiredText(input.instructions, "instructions");
    }
    if (input.photoUrl !== undefined) {
      patch.photo_url = normalizeOptionalText(input.photoUrl);
    }

    if (Object.keys(patch).length === 0) {
      throw new RecipeDomainError(RECIPE_ERROR_CODES.validation, "At least one field must be provided for update.");
    }

    const { data, error } = await supabase
      .from("recipes")
      .update(patch)
      .eq("id", recipeId)
      .eq("user_id", userId)
      .select("id, user_id, title, lead, ingredients, instructions, photo_url, created_at, updated_at")
      .single<RecipeRow>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.notFound) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.notFound, error.message, error)
      );
    }

    return toRecipe(data);
  }

  async function deleteRecipe(recipeId: UUID): Promise<void> {
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId)
      .eq("user_id", userId)
      .select("id")
      .single<{ id: string }>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.notFound) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.notFound, error.message, error)
      );
    }
  }

  async function updateRecipeWithTaxonomy(recipeId: UUID, input: UpdateRecipeWithTaxonomyInput): Promise<Recipe> {
    const { data, error } = await supabase
      .rpc("update_recipe_with_taxonomy", {
        p_recipe_id: recipeId,
        p_title: normalizeRequiredText(input.title, "title"),
        p_lead: normalizeOptionalText(input.lead),
        p_ingredients: normalizeRequiredText(input.ingredients, "ingredients"),
        p_instructions: normalizeRequiredText(input.instructions, "instructions"),
        p_photo_url: normalizeOptionalText(input.photoUrl),
        p_taxonomy_ids: [...new Set(input.taxonomyIds)],
      })
      .single<RecipeRow>();

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.notFound) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.notFound, error.message, error)
      );
    }

    return toRecipe(data);
  }

  async function assignTaxonomy(recipeId: UUID, taxonomyId: UUID): Promise<void> {
    const { error } = await supabase.from("recipe_taxonomy").insert({ recipe_id: recipeId, taxonomy_id: taxonomyId });

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.integrity) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.integrity, error.message, error)
      );
    }
  }

  return {
    createRecipe,
    listRecipes,
    searchRecipes,
    getRecipe,
    listTaxonomiesForRecipe,
    updateRecipe,
    updateRecipeWithTaxonomy,
    deleteRecipe,
    assignTaxonomy,
  };
}
