import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPE_ERROR_CODES, RecipeDomainError } from "@/lib/services/recipe.errors";
import { CreateRecipeBodySchema, CreateTaxonomyBodySchema, UpdateRecipeBodySchema } from "@/lib/schemas/recipe.schemas";

const createClient = vi.fn();
const assignTaxonomy = vi.fn();

vi.mock("@/lib/supabase", () => ({ createClient }));

vi.mock("@/lib/services/recipe.service", () => ({
  createRecipeService: vi.fn(() => ({ assignTaxonomy })),
}));

const { POST } = await import("../taxonomy");

const validRecipeId = "00000000-0000-4000-8000-000000000000";
const validTaxonomyId = "00000000-0000-4000-8000-000000000001";

function context(recipeId = validRecipeId, body: unknown = { taxonomyId: validTaxonomyId }) {
  return {
    cookies: {},
    locals: { user: { id: "user-id" } },
    params: { id: recipeId },
    request: new Request(`http://localhost/api/recipes/${recipeId}/taxonomy`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/recipes/:id/taxonomy", () => {
  beforeEach(() => {
    createClient.mockReset();
    createClient.mockReturnValue({});
    assignTaxonomy.mockReset();
  });

  it("rejects invalid recipe IDs, unexpected keys, and invalid taxonomy IDs before assignment", async () => {
    const invalidRecipeResponse = await POST(context("not-a-uuid"));
    expect(invalidRecipeResponse.status).toBe(404);

    const unknownKeyResponse = await POST(context(validRecipeId, { taxonomyId: validTaxonomyId, extra: true }));
    expect(unknownKeyResponse.status).toBe(400);

    const invalidTaxonomyResponse = await POST(context(validRecipeId, { taxonomyId: "not-a-uuid" }));
    expect(invalidTaxonomyResponse.status).toBe(400);
    expect(assignTaxonomy).not.toHaveBeenCalled();
  });

  it.each([
    [RECIPE_ERROR_CODES.notFound, 404],
    [RECIPE_ERROR_CODES.unauthorized, 404],
    [RECIPE_ERROR_CODES.validation, 400],
    [RECIPE_ERROR_CODES.integrity, 400],
    [RECIPE_ERROR_CODES.conflict, 409],
  ])("maps %s assignment errors to HTTP %i", async (code, status) => {
    assignTaxonomy.mockRejectedValue(new RecipeDomainError(code, "assignment failed"));

    const response = await POST(context());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      error: status === 404 ? "Recipe not found" : "assignment failed",
    });
  });
});

describe("write body schemas", () => {
  it("rejects unknown fields and whitespace-only required text", () => {
    expect(
      CreateRecipeBodySchema.safeParse({
        title: "Recipe",
        ingredients: "Ingredients",
        instructions: "Instructions",
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(CreateTaxonomyBodySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(
      UpdateRecipeBodySchema.safeParse({
        title: "Recipe",
        lead: null,
        ingredients: "Ingredients",
        instructions: "   ",
        photoUrl: null,
        taxonomyIds: [],
      }).success,
    ).toBe(false);
  });

  it("trims required write text before returning it", () => {
    expect(
      CreateRecipeBodySchema.parse({
        title: " Recipe ",
        ingredients: " Ingredients ",
        instructions: " Instructions ",
      }),
    ).toMatchObject({ title: "Recipe", ingredients: "Ingredients", instructions: "Instructions" });
    expect(CreateTaxonomyBodySchema.parse({ name: " Tag " })).toMatchObject({ name: "Tag" });
  });
});
