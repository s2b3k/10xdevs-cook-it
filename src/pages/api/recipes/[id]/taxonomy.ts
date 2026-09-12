import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { createRecipeService } from "@/lib/services/recipe.service";
import { RECIPE_ERROR_CODES, RecipeDomainError } from "@/lib/services/recipe.errors";
import { AssignTaxonomyBodySchema } from "@/lib/schemas/recipe.schemas";

const recipeIdSchema = z.uuid("Recipe ID must be a valid UUID");

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function domainErrorResponse(error: unknown) {
  if (error instanceof RecipeDomainError) {
    if (error.code === RECIPE_ERROR_CODES.notFound || error.code === RECIPE_ERROR_CODES.unauthorized) {
      return json({ error: "Recipe not found" }, 404);
    }
    if (error.code === RECIPE_ERROR_CODES.validation || error.code === RECIPE_ERROR_CODES.integrity) {
      return json({ error: error.message }, 400);
    }
    if (error.code === RECIPE_ERROR_CODES.conflict) {
      return json({ error: error.message }, 409);
    }
  }

  return json({ error: error instanceof Error ? error.message : "Failed to assign taxonomy" }, 500);
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsedId = recipeIdSchema.safeParse(context.params.id);
  if (!parsedId.success) {
    return json({ error: "Recipe not found" }, 404);
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
    const rawBody = await context.request.text();
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    body = JSON.parse(rawBody);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new TypeError("Body must be a JSON object");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = AssignTaxonomyBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Validation failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const service = createRecipeService(supabase, user.id);
    await service.assignTaxonomy(parsedId.data, parsed.data.taxonomyId);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return domainErrorResponse(error);
  }
};
