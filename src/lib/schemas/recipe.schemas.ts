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
