import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
const updateRecipeWithTaxonomy = vi.fn();
const deleteRecipe = vi.fn();

vi.mock("@/lib/supabase", () => ({ createClient }));

vi.mock("@/lib/services/recipe.service", () => ({
  createRecipeService: vi.fn(() => ({ updateRecipeWithTaxonomy, deleteRecipe })),
}));

const { DELETE, PATCH } = await import("../index");

const validRecipeId = "00000000-0000-4000-8000-000000000000";

function context(method: string, body?: unknown) {
  return {
    cookies: {},
    locals: { user: { id: "user-id" } },
    params: { id: validRecipeId },
    request: new Request(`http://localhost/api/recipes/${validRecipeId}`, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    }),
  } as unknown as Parameters<typeof PATCH>[0];
}

describe("recipe mutation API error mapping", () => {
  beforeEach(() => {
    createClient.mockReset();
    updateRecipeWithTaxonomy.mockReset();
    deleteRecipe.mockReset();
  });

  it("maps an unexpected PATCH service failure to HTTP 500", async () => {
    createClient.mockReturnValue({});
    updateRecipeWithTaxonomy.mockRejectedValue(new Error("database unavailable"));

    const response = await PATCH(
      context("PATCH", {
        title: "Updated",
        lead: null,
        ingredients: "Ingredients",
        instructions: "Instructions",
        photoUrl: null,
        taxonomyIds: [],
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "database unavailable" });
  });

  it("maps an unavailable Supabase client to HTTP 503 for DELETE", async () => {
    createClient.mockReturnValue(null);

    const response = await DELETE(context("DELETE"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Service unavailable" });
  });
});
