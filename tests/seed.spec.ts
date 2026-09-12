import { test, expect } from "@playwright/test";

test("created recipe appears in the authenticated recipe list", async ({ page }) => {
  const recipeTitle = `Playwright recipe ${Date.now()}`;

  await page.goto("/recipes");
  await page.getByRole("link", { name: "Add recipe" }).click();
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Title").fill(recipeTitle);
  await page.getByLabel("Lead").fill("A recipe created by the Playwright seed test.");
  await page.getByLabel("Ingredients").fill("Tomatoes\nOnion\nOlive oil");
  await page.getByLabel("Instructions").fill("Cook the onion, add tomatoes, and simmer.");
  await expect(page.getByRole("button", { name: "Save recipe" })).toBeEnabled();
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page).toHaveURL("/recipes");
  await expect(page.getByRole("heading", { name: recipeTitle })).toBeVisible();
});
