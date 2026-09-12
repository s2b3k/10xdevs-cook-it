import { z } from "zod";

export const CreateRecipeBodySchema = z.object({
  title: z.string().min(1, "Title is required"),
  lead: z.string().nullable().optional(),
  ingredients: z.string().min(1, "Ingredients are required"),
  instructions: z.string().min(1, "Instructions are required"),
  photoUrl: z.string().nullable().optional(),
});

export const CreateTaxonomyBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().nullable().optional(),
});

export const AssignTaxonomyBodySchema = z.object({
  taxonomyId: z.uuid("taxonomyId must be a valid UUID"),
});

export const SearchRecipesQuerySchema = z.object({
  ingredient: z.string().trim().optional(),
  taxonomyIds: z.array(z.uuid("taxonomyId must be a valid UUID")).default([]),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function parseSearchRecipesQuery(searchParams: URLSearchParams) {
  return SearchRecipesQuerySchema.safeParse({
    ingredient: searchParams.get("ingredient") ?? undefined,
    taxonomyIds: searchParams.getAll("taxonomyId"),
    limit: searchParams.get("limit") ?? undefined,
  });
}
