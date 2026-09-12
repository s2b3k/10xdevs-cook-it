import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { createRecipeService } from "@/lib/services/recipe.service";
import { RecipeDomainError, RECIPE_ERROR_CODES } from "@/lib/services/recipe.errors";
import { CreateRecipeBodySchema, parseSearchRecipesQuery } from "@/lib/schemas/recipe.schemas";

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const service = createRecipeService(supabase, user.id);
    const searchParams = new URL(context.request.url).searchParams;
    const parsedQuery = parseSearchRecipesQuery(searchParams);
    if (!parsedQuery.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsedQuery.error.issues) {
        const key = issue.path[0]?.toString() ?? "_";
        fields[key] = issue.message;
      }
      return new Response(JSON.stringify({ error: "Invalid search query", fields }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { ingredient, taxonomyIds, limit } = parsedQuery.data;
    const hasSearchParameters = ["ingredient", "taxonomyId", "limit"].some((parameter) => searchParams.has(parameter));
    const recipes = hasSearchParameters
      ? await service.searchRecipes({ ingredient, taxonomyIds, limit })
      : await service.listRecipes();
    return new Response(JSON.stringify({ data: recipes }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list recipes";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = CreateRecipeBodySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fields[key] = issue.message;
    }
    return new Response(JSON.stringify({ error: "Validation failed", fields }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const service = createRecipeService(supabase, user.id);
    const recipe = await service.createRecipe(parsed.data);
    return new Response(JSON.stringify({ data: recipe }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof RecipeDomainError && err.code === RECIPE_ERROR_CODES.validation) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const message = err instanceof Error ? err.message : "Failed to create recipe";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
