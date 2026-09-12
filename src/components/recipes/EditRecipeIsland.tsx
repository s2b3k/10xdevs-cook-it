import type { Recipe, Taxonomy } from "@/types";
import EditRecipeForm from "@/components/recipes/EditRecipeForm";

interface EditRecipeIslandProps {
  recipe: Recipe | null;
  taxonomies: Taxonomy[];
}

export default function EditRecipeIsland({ recipe, taxonomies }: EditRecipeIslandProps) {
  if (!recipe) {
    return null;
  }

  return <EditRecipeForm recipe={recipe} taxonomies={taxonomies} />;
}
