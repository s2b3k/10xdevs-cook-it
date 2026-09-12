export type UUID = string;

export interface Recipe {
  id: UUID;
  userId: UUID;
  title: string;
  lead: string | null;
  ingredients: string;
  instructions: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Taxonomy {
  id: UUID;
  name: string;
  category: string | null;
  createdAt: string;
}

export interface RecipeTaxonomy {
  recipeId: UUID;
  taxonomyId: UUID;
  createdAt: string;
}

export interface CreateRecipeInput {
  title: string;
  lead?: string | null;
  ingredients: string;
  instructions: string;
  photoUrl?: string | null;
}

export interface UpdateRecipeInput {
  title?: string;
  lead?: string | null;
  ingredients?: string;
  instructions?: string;
  photoUrl?: string | null;
}

export interface CreateTaxonomyInput {
  name: string;
  category?: string | null;
}

export interface AssignTaxonomyInput {
  recipeId: UUID;
  taxonomyId: UUID;
}

export interface SearchRecipesInput {
  ingredient?: string;
  taxonomyIds?: UUID[];
  limit?: number;
}
