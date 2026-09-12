import { useEffect, useRef, useState } from "react";
import { CircleAlert, RotateCcw, Search } from "lucide-react";
import RecipeCard from "@/components/recipes/RecipeCard";
import TaxonomyTagInput from "@/components/recipes/TaxonomyTagInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Recipe, Taxonomy } from "@/types";

interface RecipeSearchProps {
  initialRecipes: Recipe[];
}

export default function RecipeSearch({ initialRecipes }: RecipeSearchProps) {
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<Taxonomy[]>([]);
  const [ingredient, setIngredient] = useState("");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const hasFilters = selectedTaxonomies.length > 0 || ingredient.trim().length > 0;

  useEffect(() => {
    const normalizedIngredient = ingredient.trim();
    if (!hasFilters) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const currentRequestId = ++requestId.current;
      const params = new URLSearchParams();
      if (normalizedIngredient) {
        params.set("ingredient", normalizedIngredient);
      }
      for (const taxonomy of selectedTaxonomies) {
        params.append("taxonomyId", taxonomy.id);
      }

      void (async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/recipes?${params.toString()}`);
          const payload = (await response.json()) as { data?: Recipe[]; error?: string };
          if (!response.ok) {
            throw new Error(payload.error ?? "Failed to search recipes.");
          }
          if (currentRequestId === requestId.current) {
            setRecipes(payload.data ?? []);
          }
        } catch (err) {
          if (currentRequestId === requestId.current) {
            setError(err instanceof Error ? err.message : "Failed to search recipes.");
            setRecipes([]);
          }
        } finally {
          if (currentRequestId === requestId.current) {
            setLoading(false);
          }
        }
      })();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasFilters, ingredient, initialRecipes, selectedTaxonomies]);

  function clearFilters() {
    requestId.current += 1;
    setSelectedTaxonomies([]);
    setIngredient("");
    setRecipes(initialRecipes);
    setError(null);
    setLoading(false);
  }

  return (
    <section aria-labelledby="recipe-search-heading" className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] text-blue-200/60 uppercase">Find something to cook</p>
            <h2 id="recipe-search-heading" className="mt-2 text-xl font-semibold text-white">
              Search your recipes
            </h2>
          </div>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <TaxonomyTagInput value={selectedTaxonomies} onChange={setSelectedTaxonomies} />
          <div className="space-y-2">
            <label htmlFor="ingredient-search" className="mb-1 block text-sm text-blue-100/80">
              Ingredient
            </label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
              <input
                id="ingredient-search"
                type="search"
                value={ingredient}
                onChange={(event) => {
                  setIngredient(event.target.value);
                }}
                placeholder="Try chicken, tomato, garlic..."
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 pl-10 text-white placeholder-white/40 transition-colors outline-none focus:border-blue-200/60 focus:ring-2 focus:ring-blue-300/30"
              />
            </div>
            <p className="text-xs text-blue-100/50">Matches text fragments, without ingredient suggestions.</p>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="min-h-8">
        {hasFilters && loading ? <p className="text-sm text-blue-100/60">Searching recipes...</p> : null}
        {hasFilters && error ? (
          <p className="flex items-center gap-2 text-sm text-red-300">
            <CircleAlert className="size-4" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>

      {(hasFilters ? recipes : initialRecipes).length > 0 ? (
        <div className={cn("grid gap-4 md:grid-cols-2", hasFilters && loading && "opacity-60")}>
          {(hasFilters ? recipes : initialRecipes).map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">{hasFilters ? "No recipes found" : "No recipes yet"}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-blue-100/70">
            {hasFilters
              ? "Try removing a filter or searching for a different ingredient."
              : "Start with one recipe you know well, then use tags and ingredients to find it again fast."}
          </p>
          {hasFilters ? (
            <Button type="button" variant="outline" className="mt-6" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
