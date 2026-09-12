import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { RECIPE_ERROR_CODES } from "@/lib/services/recipe.errors";
import { createRecipeService } from "@/lib/services/recipe.service";
import { parseSearchRecipesQuery } from "@/lib/schemas/recipe.schemas";
import type { UUID } from "@/types";
import { createTestContext, type TestContext } from "./helpers";

describe("recipe service data isolation", () => {
  let context: TestContext | undefined;

  afterEach(async () => {
    await context?.cleanup();
    context = undefined;
  });

  it("does not expose another account's recipe", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const otherAccount = createRecipeService(context.users[1].client, context.users[1].id);
    const recipe = await context.createRecipe(context.users[0]);

    const otherRecipes = await otherAccount.listRecipes();

    expect(otherRecipes).not.toContainEqual(expect.objectContaining({ id: recipe.id }));
    await expect(owner.listRecipes()).resolves.toContainEqual(expect.objectContaining({ id: recipe.id }));
  });

  it("prevents another account from updating or deleting a recipe", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const otherAccount = createRecipeService(context.users[1].client, context.users[1].id);
    const recipe = await context.createRecipe(context.users[0], { title: "Original title" });

    await expect(otherAccount.updateRecipe(recipe.id, { title: "Unauthorized title" })).rejects.toMatchObject({
      code: RECIPE_ERROR_CODES.notFound,
    });
    await otherAccount.deleteRecipe(recipe.id);

    const { data, error } = await context.admin
      .from("recipes")
      .select("id, title, user_id")
      .eq("id", recipe.id)
      .single<{ id: string; title: string; user_id: string }>();

    expect(error).toBeNull();
    expect(data).toMatchObject({ id: recipe.id, title: "Original title", user_id: context.users[0].id });
    await expect(owner.listRecipes()).resolves.toContainEqual(expect.objectContaining({ title: "Original title" }));
  });

  it("prevents another account from assigning or removing a recipe relation", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const otherAccount = createRecipeService(context.users[1].client, context.users[1].id);
    const recipe = await context.createRecipe(context.users[0]);
    const taxonomy = await context.createTaxonomy(context.users[1]);
    await owner.assignTaxonomy(recipe.id, taxonomy.id);
    context.relations.push({ recipeId: recipe.id, taxonomyId: taxonomy.id });

    await expect(otherAccount.assignTaxonomy(recipe.id, taxonomy.id)).rejects.toMatchObject({
      code: RECIPE_ERROR_CODES.unauthorized,
    });

    const { error: deleteError } = await context.users[1].client
      .from("recipe_taxonomy")
      .delete()
      .match({ recipe_id: recipe.id, taxonomy_id: taxonomy.id });

    expect(deleteError).toBeNull();

    const { data, error } = await context.admin
      .from("recipe_taxonomy")
      .select("recipe_id, taxonomy_id")
      .match({ recipe_id: recipe.id, taxonomy_id: taxonomy.id })
      .single<{ recipe_id: string; taxonomy_id: string }>();

    expect(error).toBeNull();
    expect(data).toEqual({ recipe_id: recipe.id, taxonomy_id: taxonomy.id });

    const { data: ownerRelations, error: ownerRelationError } = await context.users[0].client
      .from("recipe_taxonomy")
      .select("recipe_id, taxonomy_id")
      .match({ recipe_id: recipe.id, taxonomy_id: taxonomy.id });

    expect(ownerRelationError).toBeNull();
    expect(ownerRelations).toEqual([{ recipe_id: recipe.id, taxonomy_id: taxonomy.id }]);
  });

  it("preserves one relation when duplicate assignment maps to conflict", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const recipe = await context.createRecipe(context.users[0]);
    const taxonomy = await context.createTaxonomy(context.users[0]);
    await context.assignTaxonomy(context.users[0], recipe.id, taxonomy.id);

    await expect(owner.assignTaxonomy(recipe.id, taxonomy.id)).rejects.toMatchObject({
      code: RECIPE_ERROR_CODES.conflict,
    });

    const { data, error } = await context.admin
      .from("recipe_taxonomy")
      .select("recipe_id, taxonomy_id")
      .match({ recipe_id: recipe.id, taxonomy_id: taxonomy.id });

    expect(error).toBeNull();
    expect(data).toEqual([{ recipe_id: recipe.id, taxonomy_id: taxonomy.id }]);
  });

  it("blocks missing recipe references at RLS and maps missing taxonomy to integrity", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const recipe = await context.createRecipe(context.users[0]);
    const taxonomy = await context.createTaxonomy(context.users[0]);
    const missingRecipeId = randomUUID() as UUID;
    const missingTaxonomyId = randomUUID() as UUID;

    await expect(owner.assignTaxonomy(missingRecipeId, taxonomy.id)).rejects.toMatchObject({
      code: RECIPE_ERROR_CODES.unauthorized,
    });
    await expect(owner.assignTaxonomy(recipe.id, missingTaxonomyId)).rejects.toMatchObject({
      code: RECIPE_ERROR_CODES.integrity,
    });

    const { data, error } = await context.admin
      .from("recipe_taxonomy")
      .select("recipe_id, taxonomy_id")
      .or(`recipe_id.eq.${missingRecipeId},taxonomy_id.eq.${missingTaxonomyId}`);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cascades relations when deleting a recipe and preserves taxonomy", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const recipe = await context.createRecipe(context.users[0]);
    const taxonomy = await context.createTaxonomy(context.users[0]);
    await context.assignTaxonomy(context.users[0], recipe.id, taxonomy.id);

    await owner.deleteRecipe(recipe.id);

    const { data: recipes, error: recipeError } = await context.admin.from("recipes").select("id").eq("id", recipe.id);
    const { data: relations, error: relationError } = await context.admin
      .from("recipe_taxonomy")
      .select("recipe_id, taxonomy_id")
      .eq("recipe_id", recipe.id);
    const { data: taxonomies, error: taxonomyError } = await context.admin
      .from("taxonomy")
      .select("id")
      .eq("id", taxonomy.id);

    expect(recipeError).toBeNull();
    expect(relationError).toBeNull();
    expect(taxonomyError).toBeNull();
    expect(recipes).toEqual([]);
    expect(relations).toEqual([]);
    expect(taxonomies).toEqual([{ id: taxonomy.id }]);
  });

  it("rejects deleting a referenced taxonomy and preserves the relation", async () => {
    context = await createTestContext();
    const recipe = await context.createRecipe(context.users[0]);
    const taxonomy = await context.createTaxonomy(context.users[0]);
    await context.assignTaxonomy(context.users[0], recipe.id, taxonomy.id);

    const { error: deleteError } = await context.admin.from("taxonomy").delete().eq("id", taxonomy.id);

    expect(deleteError).toMatchObject({ code: "23503" });

    const { data: taxonomies, error: taxonomyError } = await context.admin
      .from("taxonomy")
      .select("id")
      .eq("id", taxonomy.id);
    const { data: relations, error: relationError } = await context.admin
      .from("recipe_taxonomy")
      .select("recipe_id, taxonomy_id")
      .match({ recipe_id: recipe.id, taxonomy_id: taxonomy.id });

    expect(taxonomyError).toBeNull();
    expect(relationError).toBeNull();
    expect(taxonomies).toEqual([{ id: taxonomy.id }]);
    expect(relations).toEqual([{ recipe_id: recipe.id, taxonomy_id: taxonomy.id }]);
  });
});

describe("recipe service search", () => {
  let context: TestContext | undefined;

  afterEach(async () => {
    await context?.cleanup();
    context = undefined;
  });

  it("combines ingredient and multiple taxonomy filters with AND semantics", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const cuisine = await context.createTaxonomy(context.users[0], `Cuisine ${randomUUID()}`);
    const meal = await context.createTaxonomy(context.users[0], `Meal ${randomUUID()}`);
    const matchingRecipe = await context.createRecipe(context.users[0], {
      title: "Matching recipe",
      ingredients: "KURCZAK\nPaprika",
    });
    const taxonomyOnlyRecipe = await context.createRecipe(context.users[0], {
      title: "Taxonomy only recipe",
      ingredients: "Tofu",
    });
    const ingredientOnlyRecipe = await context.createRecipe(context.users[0], {
      title: "Ingredient only recipe",
      ingredients: "Kurczak",
    });

    await context.assignTaxonomy(context.users[0], matchingRecipe.id, cuisine.id);
    await context.assignTaxonomy(context.users[0], matchingRecipe.id, meal.id);
    await context.assignTaxonomy(context.users[0], taxonomyOnlyRecipe.id, cuisine.id);
    await context.assignTaxonomy(context.users[0], ingredientOnlyRecipe.id, meal.id);

    const results = await owner.searchRecipes({
      ingredient: "  kur ",
      taxonomyIds: [cuisine.id, meal.id],
      limit: 10,
    });

    expect(results.map((recipe) => recipe.id)).toEqual([matchingRecipe.id]);
  });

  it("keeps results unique, ordered, bounded, and isolated by user", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const otherAccount = createRecipeService(context.users[1].client, context.users[1].id);
    const taxonomy = await context.createTaxonomy(context.users[0], `Shared filter ${randomUUID()}`);
    const olderRecipe = await context.createRecipe(context.users[0], {
      title: "Older recipe",
      ingredients: "Tomato",
    });
    const newerRecipe = await context.createRecipe(context.users[0], {
      title: "Newer recipe",
      ingredients: "Tomato",
    });
    const otherRecipe = await context.createRecipe(context.users[1], {
      title: "Other account recipe",
      ingredients: "Tomato",
    });

    await context.assignTaxonomy(context.users[0], olderRecipe.id, taxonomy.id);
    await context.assignTaxonomy(context.users[0], newerRecipe.id, taxonomy.id);
    await context.assignTaxonomy(context.users[1], otherRecipe.id, taxonomy.id);

    const results = await owner.searchRecipes({ taxonomyIds: [taxonomy.id], limit: 1 });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(newerRecipe.id);
    await expect(otherAccount.searchRecipes({ taxonomyIds: [taxonomy.id] })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: otherRecipe.id })]),
    );
  });

  it("returns an empty result for unmatched filters and protects single-recipe reads", async () => {
    context = await createTestContext();
    const owner = createRecipeService(context.users[0].client, context.users[0].id);
    const otherAccount = createRecipeService(context.users[1].client, context.users[1].id);
    const recipe = await context.createRecipe(context.users[0], { ingredients: "Potato" });

    await expect(owner.searchRecipes({ ingredient: "does-not-exist" })).resolves.toEqual([]);
    await expect(owner.getRecipe(recipe.id)).resolves.toMatchObject({ id: recipe.id });
    await expect(otherAccount.getRecipe(recipe.id)).rejects.toMatchObject({ code: RECIPE_ERROR_CODES.notFound });
  });
});

describe("recipe search query parsing", () => {
  it("normalizes optional values and repeated taxonomy ids", () => {
    const taxonomyId = randomUUID();
    const result = parseSearchRecipesQuery(new URLSearchParams({ ingredient: "  kur ", taxonomyId, limit: "5" }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ingredient: "kur", taxonomyIds: [taxonomyId], limit: 5 });
    }
  });

  it("rejects malformed taxonomy ids and out-of-range limits", () => {
    const result = parseSearchRecipesQuery(new URLSearchParams({ taxonomyId: "not-a-uuid", limit: "101" }));

    expect(result.success).toBe(false);
  });
});
