import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateRecipeInput, Recipe, UpdateRecipeInput, UUID } from "@/types";
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
  updateRecipe(recipeId: UUID, input: UpdateRecipeInput): Promise<Recipe>;
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
    const { error } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", userId);

    if (error) {
      throw (
        mapSupabaseError(error, RECIPE_ERROR_CODES.notFound) ??
        new RecipeDomainError(RECIPE_ERROR_CODES.notFound, error.message, error)
      );
    }
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
    updateRecipe,
    deleteRecipe,
    assignTaxonomy,
  };
}
