import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));

interface RecipeResponse {
  data: { id: string; title: string };
}

interface TaxonomyResponse {
  data: { id: string; name: string };
}

type TaxonomyFixture = TaxonomyResponse["data"];

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

test("rejects malformed and invalid taxonomy-assignment payloads without persisting relations", async ({ page }) => {
  const suffix = Date.now();
  const createResponse = await page.request.post("/api/recipes", {
    data: {
      title: `Taxonomy payload recipe ${suffix}`,
      ingredients: "Tomatoes",
      instructions: "Cook them.",
    },
  });
  expect(createResponse.status()).toBe(201);
  const recipe = ((await createResponse.json()) as RecipeResponse).data;

  const admin = createAdminClient();

  try {
    const invalidJsonResponse = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      headers: { "Content-Type": "application/json" },
      data: "{not valid json",
    });
    expect(invalidJsonResponse.status()).toBe(400);
    await expect(invalidJsonResponse.json()).resolves.toMatchObject({ error: "Invalid JSON body" });

    const missingFieldsResponse = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: {},
    });
    expect(missingFieldsResponse.status()).toBe(400);
    await expect(missingFieldsResponse.json()).resolves.toMatchObject({ error: expect.any(String) });

    const whitespaceIdResponse = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: { taxonomyId: "   " },
    });
    expect(whitespaceIdResponse.status()).toBe(400);

    const invalidUuidResponse = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: { taxonomyId: "not-a-uuid" },
    });
    expect(invalidUuidResponse.status()).toBe(400);

    const unknownKeyResponse = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: { taxonomyId: "00000000-0000-4000-8000-00000000000a", extra: true },
    });
    expect(unknownKeyResponse.status()).toBe(400);

    const missingTaxonomyResponse = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: { taxonomyId: "00000000-0000-4000-8000-000000000010" },
    });
    expect(missingTaxonomyResponse.status()).toBe(400);

    const { count, error } = await admin
      .from("recipe_taxonomy")
      .select("taxonomy_id", { count: "exact", head: true })
      .eq("recipe_id", recipe.id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  } finally {
    await admin.from("recipe_taxonomy").delete().eq("recipe_id", recipe.id);
    await admin.from("recipes").delete().eq("id", recipe.id);
  }
});

test("rejects duplicate taxonomy assignment without duplicating the relation", async ({ page }) => {
  const suffix = Date.now();
  const createResponse = await page.request.post("/api/recipes", {
    data: {
      title: `Duplicate taxonomy recipe ${suffix}`,
      ingredients: "Tomatoes",
      instructions: "Cook them.",
    },
  });
  expect(createResponse.status()).toBe(201);
  const recipe = ((await createResponse.json()) as RecipeResponse).data;

  const taxonomyResponse = await page.request.post("/api/taxonomy", {
    data: { name: `Duplicate taxonomy ${suffix}` },
  });
  expect(taxonomyResponse.status()).toBe(201);
  const taxonomy = ((await taxonomyResponse.json()) as TaxonomyResponse).data;
  const admin = createAdminClient();

  try {
    const firstAssignment = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: { taxonomyId: taxonomy.id },
    });
    expect(firstAssignment.status()).toBe(200);

    const duplicateAssignment = await page.request.post(`/api/recipes/${recipe.id}/taxonomy`, {
      data: { taxonomyId: taxonomy.id },
    });
    expect(duplicateAssignment.status()).toBe(409);

    const { count, error } = await admin
      .from("recipe_taxonomy")
      .select("taxonomy_id", { count: "exact", head: true })
      .eq("recipe_id", recipe.id)
      .eq("taxonomy_id", taxonomy.id);

    expect(error).toBeNull();
    expect(count).toBe(1);
  } finally {
    await admin.from("recipe_taxonomy").delete().eq("recipe_id", recipe.id);
    await admin.from("recipes").delete().eq("id", recipe.id);
    await admin.from("taxonomy").delete().eq("id", taxonomy.id);
  }
});

test("redirects with a warning when one taxonomy assignment fails after creation succeeds", async ({ page }) => {
  const recipeTitle = `Partial assignment recipe ${Date.now()}`;
  const tagOne = `Partial tag ${Date.now()}-one`;
  const tagTwo = `Partial tag ${Date.now()}-two`;
  const admin = createAdminClient();
  const taxonomies: TaxonomyFixture[] = [];
  let taxonomyAssignmentCalls = 0;

  for (const tagName of [tagOne, tagTwo]) {
    const taxonomyResponse = await page.request.post("/api/taxonomy", {
      data: { name: tagName },
    });
    expect([200, 201]).toContain(taxonomyResponse.status());
    taxonomies.push(((await taxonomyResponse.json()) as TaxonomyResponse).data);
  }

  await page.route("**/api/taxonomy**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    const query = new URL(route.request().url()).searchParams.get("q")?.toLowerCase() ?? "";
    const matches = taxonomies.filter((taxonomy) => taxonomy.name.toLowerCase().includes(query));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: matches }),
    });
  });

  await page.route("**/api/recipes/*/taxonomy", async (route) => {
    taxonomyAssignmentCalls += 1;
    if (taxonomyAssignmentCalls === 1) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Assignment failed" }),
    });
  });

  try {
    await page.goto("/recipes/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Title").fill(recipeTitle);
    await page.getByLabel("Ingredients").fill("Tomatoes\nOnion\nOlive oil");
    await page.getByLabel("Instructions").fill("Cook the onion, add tomatoes, and simmer.");

    for (const tagName of [tagOne, tagTwo]) {
      const taxonomyField = page.getByLabel("Taxonomy tags");
      await taxonomyField.fill(tagName);
      const suggestion = page.getByRole("button", { name: tagName, exact: true });
      await expect(suggestion).toBeVisible();
      await suggestion.click();
      await expect(page.getByText(tagName, { exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "Save recipe" }).click();

    await expect(page).toHaveURL(/\/recipes\?warning=/);
    await expect(page.getByText(/Recipe was saved, but/i)).toBeVisible();

    const { data: recipe, error: recipeError } = await admin
      .from("recipes")
      .select("id")
      .eq("title", recipeTitle)
      .single();

    expect(recipeError).toBeNull();
    expect(recipe).not.toBeNull();
    if (!recipe) {
      throw new Error("Expected the created recipe to be persisted.");
    }

    const { count, error: relationError } = await admin
      .from("recipe_taxonomy")
      .select("taxonomy_id", { count: "exact", head: true })
      .eq("recipe_id", recipe.id);

    expect(relationError).toBeNull();
    expect(count).toBe(1);
  } finally {
    const { data: recipe } = await admin.from("recipes").select("id").eq("title", recipeTitle).maybeSingle();
    if (recipe) {
      await admin.from("recipe_taxonomy").delete().eq("recipe_id", recipe.id);
      await admin.from("recipes").delete().eq("id", recipe.id);
    }
    await admin
      .from("taxonomy")
      .delete()
      .in(
        "id",
        taxonomies.map((taxonomy) => taxonomy.id),
      );
  }
});
