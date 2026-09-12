import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { createRecipeService } from "@/lib/services/recipe.service";
import { RECIPE_ERROR_CODES, RecipeDomainError } from "@/lib/services/recipe.errors";
import { UpdateRecipeBodySchema } from "@/lib/schemas/recipe.schemas";

const recipeIdSchema = z.uuid("Recipe ID must be a valid UUID");

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function domainErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof RecipeDomainError) {
    if (error.code === RECIPE_ERROR_CODES.notFound || error.code === RECIPE_ERROR_CODES.unauthorized) {
      return json({ error: "Recipe not found" }, 404);
    }
    if (error.code === RECIPE_ERROR_CODES.validation) {
      return json({ error: error.message }, 400);
    }
    if (error.code === RECIPE_ERROR_CODES.integrity) {
      return json({ error: error.message }, 400);
    }
  }

  return json({ error: error instanceof Error ? error.message : fallbackMessage }, 500);
}

export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const parsedId = recipeIdSchema.safeParse(context.params.id);
  if (!parsedId.success) {
    return json({ error: "Recipe not found" }, 404);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Service unavailable" }, 503);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsedBody = UpdateRecipeBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsedBody.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fields[key] = issue.message;
    }
    return json({ error: "Validation failed", fields }, 400);
  }

  try {
    const service = createRecipeService(supabase, user.id);
    const recipe = await service.updateRecipeWithTaxonomy(parsedId.data, parsedBody.data);
    return json({ data: recipe }, 200);
  } catch (error) {
    return domainErrorResponse(error, "Failed to update recipe");
  }
};

export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const parsedId = recipeIdSchema.safeParse(context.params.id);
  if (!parsedId.success) {
    return json({ error: "Recipe not found" }, 404);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Service unavailable" }, 503);
  }

  try {
    const service = createRecipeService(supabase, user.id);
    await service.deleteRecipe(parsedId.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    return domainErrorResponse(error, "Failed to delete recipe");
  }
};
