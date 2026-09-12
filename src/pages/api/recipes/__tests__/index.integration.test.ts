import { beforeEach, describe, expect, it, vi } from "vitest";

const listRecipes = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/recipe.service", () => ({
  createRecipeService: vi.fn(() => ({ listRecipes })),
}));

const { GET } = await import("../index");

describe("GET /api/recipes", () => {
  beforeEach(() => {
    listRecipes.mockReset();
  });

  it("maps an unexpected service failure to HTTP 500", async () => {
    listRecipes.mockRejectedValue(new Error("database unavailable"));

    const context = {
      cookies: {},
      locals: { user: { id: "user-id" } },
      request: new Request("http://localhost/api/recipes"),
    } as unknown as Parameters<typeof GET>[0];

    const response = await GET(context);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "database unavailable" });
  });
});
