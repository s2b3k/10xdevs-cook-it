import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));

interface RecipeResponse {
  data: { id: string; title: string };
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("API test cleanup requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

test("updates and deletes an owned recipe through the mutation API", async ({ browser, page }) => {
  const suffix = Date.now();
  const createResponse = await page.request.post("/api/recipes", {
    data: {
      title: `API mutation recipe ${suffix}`,
      lead: "Original lead",
      ingredients: "Original ingredients",
      instructions: "Original instructions",
    },
  });
  expect(createResponse.status()).toBe(201);
  const recipe = ((await createResponse.json()) as RecipeResponse).data;

  try {
    const unauthenticatedContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const unauthenticatedResponse = await unauthenticatedContext.request.delete(`/api/recipes/${recipe.id}`, {
      headers: { Origin: "http://localhost:4321" },
    });
    expect(unauthenticatedResponse.status()).toBe(401);
    await unauthenticatedContext.close();

    const invalidIdResponse = await page.request.patch("/api/recipes/not-a-uuid", {
      data: {
        title: "Updated",
        lead: null,
        ingredients: "Ingredients",
        instructions: "Instructions",
        photoUrl: null,
        taxonomyIds: [],
      },
    });
    expect(invalidIdResponse.status()).toBe(404);

    const invalidBodyResponse = await page.request.patch(`/api/recipes/${recipe.id}`, {
      data: { title: "Missing required fields" },
    });
    expect(invalidBodyResponse.status()).toBe(400);
    expect(((await invalidBodyResponse.json()) as { fields?: Record<string, string> }).fields).toMatchObject({
      ingredients: expect.any(String),
      instructions: expect.any(String),
    });

    const updateResponse = await page.request.patch(`/api/recipes/${recipe.id}`, {
      data: {
        title: `Updated API mutation recipe ${suffix}`,
        lead: "Updated lead",
        ingredients: "Updated ingredients",
        instructions: "Updated instructions",
        photoUrl: null,
        taxonomyIds: [],
      },
    });
    expect(updateResponse.status()).toBe(200);
    expect(((await updateResponse.json()) as RecipeResponse).data).toMatchObject({
      id: recipe.id,
      title: `Updated API mutation recipe ${suffix}`,
    });

    const deleteResponse = await page.request.delete(`/api/recipes/${recipe.id}`, {
      headers: { Origin: "http://localhost:4321" },
    });
    expect(deleteResponse.status()).toBe(204);
  } finally {
    await createAdminClient().from("recipes").delete().eq("id", recipe.id);
  }
});
