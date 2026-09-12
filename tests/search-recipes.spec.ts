import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));

interface RecipeResponse {
  data: { id: string };
}

interface TaxonomyResponse {
  data: { id: string; name: string };
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("E2E cleanup requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function cleanupFixtures(recipeIds: string[], taxonomyIds: string[]) {
  const admin = createAdminClient();
  const { error: relationError } = await admin.from("recipe_taxonomy").delete().in("recipe_id", recipeIds);
  const { error: recipeError } = await admin.from("recipes").delete().in("id", recipeIds);
  const { error: taxonomyError } = await admin.from("taxonomy").delete().in("id", taxonomyIds);
  const errors = [relationError, recipeError, taxonomyError]
    .filter((error): error is NonNullable<typeof error> => Boolean(error))
    .map((error) => error.message);
  if (errors.length > 0) {
    throw new Error(`E2E fixture cleanup failed: ${errors.join("; ")}`);
  }
}

async function createTaxonomy(page: Page, name: string) {
  const response = await page.request.post("/api/taxonomy", {
    data: { name },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as TaxonomyResponse).data;
}

async function createRecipe(page: Page, title: string, ingredients: string) {
  const response = await page.request.post("/api/recipes", {
    data: {
      title,
      lead: `Lead for ${title}`,
      ingredients,
      instructions: `Instructions for ${title}`,
    },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as RecipeResponse).data;
}

async function assignTaxonomy(page: Page, recipeId: string, taxonomyId: string) {
  const response = await page.request.post(`/api/recipes/${recipeId}/taxonomy`, {
    data: { taxonomyId },
  });
  expect(response.ok()).toBe(true);
}

test("searches by taxonomy and ingredient, then opens complete details", async ({ page }) => {
  const suffix = Date.now();
  const taxonomyA = await createTaxonomy(page, `E2E cuisine ${suffix}`);
  const taxonomyB = await createTaxonomy(page, `E2E weeknight ${suffix}`);
  const matchingTitle = `E2E matching recipe ${suffix}`;
  const taxonomyOnlyTitle = `E2E taxonomy only ${suffix}`;
  const ingredientOnlyTitle = `E2E ingredient only ${suffix}`;
  const matchingRecipe = await createRecipe(page, matchingTitle, "KURCZAK\nPaprika");
  const taxonomyOnlyRecipe = await createRecipe(page, taxonomyOnlyTitle, "Tofu");
  const ingredientOnlyRecipe = await createRecipe(page, ingredientOnlyTitle, "Kurczak");

  await assignTaxonomy(page, matchingRecipe.id, taxonomyA.id);
  await assignTaxonomy(page, matchingRecipe.id, taxonomyB.id);
  await assignTaxonomy(page, taxonomyOnlyRecipe.id, taxonomyA.id);
  await assignTaxonomy(page, ingredientOnlyRecipe.id, taxonomyB.id);

  try {
    const combinedResponse = await page.request.get(
      `/api/recipes?ingredient=kur&taxonomyId=${taxonomyA.id}&taxonomyId=${taxonomyB.id}`,
    );
    expect(combinedResponse.status()).toBe(200);
    const combinedPayload = (await combinedResponse.json()) as { data: { id: string }[] };
    expect(combinedPayload.data.map(({ id }) => id)).toEqual([matchingRecipe.id]);

    const emptyResponse = await page.request.get("/api/recipes?ingredient=missing-e2e-fragment");
    expect(emptyResponse.status()).toBe(200);
    expect(((await emptyResponse.json()) as { data: unknown[] }).data).toEqual([]);

    const invalidResponse = await page.request.get("/api/recipes?taxonomyId=not-a-uuid&limit=101");
    expect(invalidResponse.status()).toBe(400);

    await page.goto("/recipes");
    const ingredientInput = page.getByRole("searchbox", { name: "Ingredient" });
    await Promise.all([
      page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/recipes" && url.searchParams.get("ingredient")?.toLowerCase() === "kur";
      }),
      ingredientInput.fill(" KUR "),
    ]);
    await expect(page.getByRole("heading", { name: matchingTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: ingredientOnlyTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: taxonomyOnlyTitle })).not.toBeVisible();

    const taxonomyInput = page.getByLabel("Taxonomy tags");
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/taxonomy?q=")),
      taxonomyInput.fill(taxonomyA.name),
    ]);
    await expect(page.getByRole("button", { name: taxonomyA.name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: taxonomyA.name, exact: true }).click();
    await expect(page.getByRole("heading", { name: matchingTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: ingredientOnlyTitle })).not.toBeVisible();

    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/taxonomy?q=")),
      taxonomyInput.fill(taxonomyB.name),
    ]);
    await expect(page.getByRole("button", { name: taxonomyB.name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: taxonomyB.name, exact: true }).click();
    await expect(page.getByRole("heading", { name: matchingTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: taxonomyOnlyTitle })).not.toBeVisible();

    await ingredientInput.fill("no-match-fragment");
    await expect(page.getByRole("heading", { name: "No recipes found" })).toBeVisible();
    await expect(page.getByText("Try removing a filter or searching for a different ingredient.")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page.getByRole("heading", { name: matchingTitle })).toBeVisible();

    await page.getByRole("link", { name: `Open recipe ${matchingTitle}` }).click();
    await expect(page).toHaveURL(new RegExp(`/recipes/${matchingRecipe.id}$`));
    await expect(page.getByRole("heading", { name: matchingTitle })).toBeVisible();
    await expect(page.getByText("Lead for").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
    await expect(page.getByText("KURCZAK", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Instructions" })).toBeVisible();
    await expect(page.getByText(`Instructions for ${matchingTitle}`)).toBeVisible();
    await expect(page.getByText(taxonomyA.name)).toBeVisible();
    await expect(page.getByText(taxonomyB.name)).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to recipes" })).toBeVisible();
  } finally {
    await cleanupFixtures(
      [matchingRecipe.id, taxonomyOnlyRecipe.id, ingredientOnlyRecipe.id],
      [taxonomyA.id, taxonomyB.id],
    );
  }
});

test("recipes API requires authentication", async ({ browser }) => {
  const unauthenticatedContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await unauthenticatedContext.request.get("/api/recipes");
  await unauthenticatedContext.close();

  expect(response.status()).toBe(401);
});
