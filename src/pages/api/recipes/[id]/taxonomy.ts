import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { createRecipeService } from "@/lib/services/recipe.service";
import { AssignTaxonomyBodySchema } from "@/lib/schemas/recipe.schemas";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recipeId = context.params.id;
  if (!recipeId) {
    return new Response(JSON.stringify({ error: "Recipe ID is required" }), {
      status: 400,
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

  const parsed = AssignTaxonomyBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Validation failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const service = createRecipeService(supabase, user.id);
    await service.assignTaxonomy(recipeId, parsed.data.taxonomyId);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign taxonomy";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
