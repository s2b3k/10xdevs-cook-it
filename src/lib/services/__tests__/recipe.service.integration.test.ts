import { afterEach, describe, expect, it } from "vitest";
import { RECIPE_ERROR_CODES } from "@/lib/services/recipe.errors";
import { createRecipeService } from "@/lib/services/recipe.service";
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
});