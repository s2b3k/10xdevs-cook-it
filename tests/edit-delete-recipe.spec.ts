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

async function cleanupFixtures(recipeId: string, taxonomyIds: string[]) {
  const admin = createAdminClient();
  const { error: relationError } = await admin.from("recipe_taxonomy").delete().eq("recipe_id", recipeId);
  const { error: recipeError } = await admin.from("recipes").delete().eq("id", recipeId);
  const { error: taxonomyError } = await admin.from("taxonomy").delete().in("id", taxonomyIds);
  const errors = [relationError, recipeError, taxonomyError]
    .filter((error): error is NonNullable<typeof error> => Boolean(error))
    .map((error) => error.message);
  if (errors.length > 0) {
    throw new Error(`E2E cleanup failed: ${errors.join("; ")}`);
  }
}

async function createTaxonomy(page: Page, name: string) {
  const response = await page.request.post("/api/taxonomy", { data: { name } });
  expect(response.status()).toBe(201);
  return ((await response.json()) as TaxonomyResponse).data;
}

async function assignTaxonomy(page: Page, recipeId: string, taxonomyId: string) {
  const response = await page.request.post(`/api/recipes/${recipeId}/taxonomy`, {
    data: { taxonomyId },
  });
  expect(response.ok()).toBe(true);
}

test("edits, cancels, and deletes an owned recipe", async ({ page }) => {
  const suffix = Date.now();
  const originalTitle = `E2E editable recipe ${suffix}`;
  const updatedTitle = `E2E updated recipe ${suffix}`;
  const retainedTag = await createTaxonomy(page, `E2E retained tag ${suffix}`);
  const removedTag = await createTaxonomy(page, `E2E removed tag ${suffix}`);
  const addedTag = await createTaxonomy(page, `E2E added tag ${suffix}`);
  const createResponse = await page.request.post("/api/recipes", {
    data: {
      title: originalTitle,
      lead: `Original lead ${suffix}`,
      ingredients: `Original ingredients ${suffix}`,
      instructions: `Original instructions ${suffix}`,
    },
  });
  expect(createResponse.status()).toBe(201);
  const recipe = ((await createResponse.json()) as RecipeResponse).data;
  await assignTaxonomy(page, recipe.id, retainedTag.id);
  await assignTaxonomy(page, recipe.id, removedTag.id);

  try {
    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.locator("[data-hydrated='true']").first()).toBeVisible();
    await page.getByRole("button", { name: "Edit recipe" }).click();
    await expect(page).toHaveURL(new RegExp(`/recipes/${recipe.id}/edit$`));
    await expect(page.getByRole("heading", { name: "Keep this one worth cooking again" })).toBeVisible();
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();

    await page.getByLabel("Title").fill(updatedTitle);
    await expect(page.getByLabel("Title")).toHaveValue(updatedTitle);

    await page.getByLabel("Lead").fill(`Updated lead ${suffix}`);
    await expect(page.getByLabel("Lead")).toHaveValue(`Updated lead ${suffix}`);

    await page.getByLabel("Ingredients").fill(`Updated ingredients ${suffix}`);
    await expect(page.getByLabel("Ingredients")).toHaveValue(`Updated ingredients ${suffix}`);

    await page.getByLabel("Instructions").fill(`Updated instructions ${suffix}`);
    await expect(page.getByLabel("Instructions")).toHaveValue(`Updated instructions ${suffix}`);
    await page.getByLabel(`Remove ${removedTag.name}`).click();

    const taxonomyInput = page.getByLabel("Taxonomy tags");
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/taxonomy?q=")),
      taxonomyInput.fill(addedTag.name),
    ]);
    await page.getByRole("button", { name: addedTag.name, exact: true }).click();
    await expect(page.getByLabel(`Remove ${addedTag.name}`)).toBeVisible();
    await expect(page.getByRole("button", { name: addedTag.name, exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/recipes/${recipe.id}$`));
    await expect(page.locator("[data-hydrated='true']").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(page.getByText(`Updated ingredients ${suffix}`)).toBeVisible();
    await expect(page.getByText(retainedTag.name)).toBeVisible();
    await expect(page.getByText(addedTag.name)).toBeVisible();
    await expect(page.getByText(removedTag.name)).not.toBeVisible();

    await page.getByRole("button", { name: "Edit recipe" }).click();
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await page.getByLabel("Title").fill("Unsaved title");
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(new RegExp(`/recipes/${recipe.id}$`));
    await expect(page.locator("[data-hydrated='true']").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unsaved title" })).not.toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete this recipe?")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete recipe" }).click();

    await expect(page).toHaveURL(/\/recipes$/);
    await expect(page.getByRole("heading", { name: updatedTitle })).not.toBeVisible();
  } finally {
    await cleanupFixtures(recipe.id, [retainedTag.id, removedTag.id, addedTag.id]);
  }
});
