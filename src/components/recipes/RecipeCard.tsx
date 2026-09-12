import { ArrowRight, ImageOff } from "lucide-react";
import type { Recipe } from "@/types";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm transition-colors hover:border-blue-200/30 hover:bg-white/12">
      {recipe.photoUrl ? (
        <img
          src={recipe.photoUrl}
          alt=""
          className="mb-5 aspect-[16/9] w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="mb-5 flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 text-white/35">
          <ImageOff className="size-8" aria-hidden="true" />
        </div>
      )}
      <h2 className="text-xl font-semibold text-white">{recipe.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-blue-100/70">
        {recipe.lead ?? "No lead yet. Open the recipe to see the full ingredients and instructions."}
      </p>
      <a
        href={`/recipes/${recipe.id}`}
        aria-label={`Open recipe ${recipe.title}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-200 transition-colors hover:text-white"
      >
        Open recipe
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </a>
    </article>
  );
}
