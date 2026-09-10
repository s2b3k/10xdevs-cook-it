import { afterEach, describe, expect, it } from "vitest";
import { createTestContext, type TestContext } from "./helpers";

describe("Supabase integration foundation", () => {
  let context: TestContext | undefined;

  afterEach(async () => {
    await context?.cleanup();
    context = undefined;
  });

  it("creates and cleans up authenticated fixture resources", async () => {
    context = await createTestContext();
    const recipe = await context.createRecipe(context.users[0]);
    const taxonomy = await context.createTaxonomy(context.users[0]);

    await context.assignTaxonomy(context.users[0], recipe.id, taxonomy.id);

    expect(context.users[0].id).not.toBe(context.users[1].id);
    expect(context.recipes).toContainEqual(recipe);
    expect(context.taxonomies).toContainEqual(taxonomy);
    expect(context.relations).toContainEqual({ recipeId: recipe.id, taxonomyId: taxonomy.id });
  });
});
