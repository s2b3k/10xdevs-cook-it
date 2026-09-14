import { afterEach, describe, expect, it } from "vitest";
import { createStatsService } from "@/lib/services/stats.service";
import { createTestContext, type TestContext } from "./helpers";

describe("stats service user statistics", () => {
  let context: TestContext | undefined;

  afterEach(async () => {
    await context?.cleanup();
    context = undefined;
  });

  it("returns zeros for a user with no recipes", async () => {
    context = await createTestContext();
    const statsService = createStatsService(context.users[0].client, context.users[0].id);

    const stats = await statsService.getUserStats();

    expect(stats).toEqual({
      recipeCount: 0,
      taxonomyCount: 0,
    });
  });

  it("calculates recipe count and unique taxonomy count for a user", async () => {
    context = await createTestContext();
    const user = context.users[0];
    const statsService = createStatsService(user.client, user.id);

    const recipe1 = await context.createRecipe(user, { title: "Recipe 1" });
    const recipe2 = await context.createRecipe(user, { title: "Recipe 2" });

    const taxA = await context.createTaxonomy(user, "Italian", "Cuisine");
    const taxB = await context.createTaxonomy(user, "Pasta", "Dish");
    const taxC = await context.createTaxonomy(user, "Quick", "Time");

    // Assign taxA and taxB to recipe1; taxB and taxC to recipe2
    await context.assignTaxonomy(user, recipe1.id, taxA.id);
    await context.assignTaxonomy(user, recipe1.id, taxB.id);
    await context.assignTaxonomy(user, recipe2.id, taxB.id);
    await context.assignTaxonomy(user, recipe2.id, taxC.id);

    const stats = await statsService.getUserStats();

    expect(stats).toEqual({
      recipeCount: 2,
      taxonomyCount: 3, // taxA, taxB, taxC (taxB is deduplicated)
    });
  });

  it("ensures stats isolation between different users", async () => {
    context = await createTestContext();
    const userA = context.users[0];
    const userB = context.users[1];

    const statsServiceA = createStatsService(userA.client, userA.id);
    const statsServiceB = createStatsService(userB.client, userB.id);

    const recipeA = await context.createRecipe(userA, { title: "User A Recipe" });
    const taxA = await context.createTaxonomy(userA, "Mexican", "Cuisine");
    await context.assignTaxonomy(userA, recipeA.id, taxA.id);

    const statsA = await statsServiceA.getUserStats();
    const statsB = await statsServiceB.getUserStats();

    expect(statsA).toEqual({
      recipeCount: 1,
      taxonomyCount: 1,
    });
    expect(statsB).toEqual({
      recipeCount: 0,
      taxonomyCount: 0,
    });
  });
});
