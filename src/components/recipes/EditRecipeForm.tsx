import { BookText, CookingPot, ImageIcon, ListPlus, Sparkles, StickyNote } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Recipe, Taxonomy } from "@/types";
import TaxonomyTagInput from "@/components/recipes/TaxonomyTagInput";

type FieldErrors = Partial<Record<"title" | "lead" | "ingredients" | "instructions" | "photoUrl" | "taxonomy", string>>;

const textareaBase =
  "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors focus:outline-none focus:ring-2";

interface EditRecipeFormProps {
  recipe: Recipe;
  taxonomies: Taxonomy[];
}

export default function EditRecipeForm({ recipe, taxonomies }: EditRecipeFormProps) {
  const [title, setTitle] = useState(recipe.title);
  const [lead, setLead] = useState(recipe.lead ?? "");
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [instructions, setInstructions] = useState(recipe.instructions);
  const [photoUrl, setPhotoUrl] = useState(recipe.photoUrl ?? "");
  const [selectedTags, setSelectedTags] = useState<Taxonomy[]>(taxonomies);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearError(field: keyof FieldErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = "Title is required";
    if (!ingredients.trim()) nextErrors.ingredients = "Ingredients are required";
    if (!instructions.trim()) nextErrors.instructions = "Instructions are required";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          lead: lead.trim() || null,
          ingredients,
          instructions,
          photoUrl: photoUrl.trim() || null,
          taxonomyIds: selectedTags.map((tag) => tag.id),
        }),
      });
      const payload = (await response.json()) as {
        data?: Recipe;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok || !payload.data) {
        if (response.status === 400 && payload.fields) {
          setFieldErrors(payload.fields);
          return;
        }
        throw new Error(payload.error ?? "Failed to update recipe.");
      }

      window.location.href = `/recipes/${recipe.id}`;
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to update recipe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <FormField
        id="title"
        label="Title"
        value={title}
        onChange={(value) => {
          setTitle(value);
          clearError("title");
        }}
        placeholder="Creamy tomato soup"
        error={fieldErrors.title}
        icon={<Sparkles className="size-4" />}
      />

      <FormField
        id="lead"
        label="Lead"
        value={lead}
        onChange={(value) => {
          setLead(value);
          clearError("lead");
        }}
        placeholder="One-line reminder why this recipe is worth making"
        error={fieldErrors.lead}
        icon={<StickyNote className="size-4" />}
      />

      <div>
        <label htmlFor="ingredients" className="mb-1 block text-sm text-blue-100/80">
          Ingredients
        </label>
        <div className="relative">
          <ListPlus className="absolute top-3 left-3 size-4 text-white/40" />
          <textarea
            id="ingredients"
            value={ingredients}
            onChange={(event) => {
              setIngredients(event.target.value);
              clearError("ingredients");
            }}
            rows={5}
            className={cn(
              textareaBase,
              "pl-10",
              fieldErrors.ingredients
                ? "border-red-400/60 focus:ring-red-400"
                : "border-white/20 focus:ring-purple-400",
            )}
          />
        </div>
        {fieldErrors.ingredients ? <p className="mt-1 text-xs text-red-300">{fieldErrors.ingredients}</p> : null}
      </div>

      <div>
        <label htmlFor="instructions" className="mb-1 block text-sm text-blue-100/80">
          Instructions
        </label>
        <div className="relative">
          <CookingPot className="absolute top-3 left-3 size-4 text-white/40" />
          <textarea
            id="instructions"
            value={instructions}
            onChange={(event) => {
              setInstructions(event.target.value);
              clearError("instructions");
            }}
            rows={7}
            className={cn(
              textareaBase,
              "pl-10",
              fieldErrors.instructions
                ? "border-red-400/60 focus:ring-red-400"
                : "border-white/20 focus:ring-purple-400",
            )}
          />
        </div>
        {fieldErrors.instructions ? <p className="mt-1 text-xs text-red-300">{fieldErrors.instructions}</p> : null}
      </div>

      <FormField
        id="photoUrl"
        label="Photo URL"
        type="url"
        value={photoUrl}
        onChange={(value) => {
          setPhotoUrl(value);
          clearError("photoUrl");
        }}
        placeholder="https://example.com/photo.jpg"
        error={fieldErrors.photoUrl}
        icon={<ImageIcon className="size-4" />}
      />

      <TaxonomyTagInput
        value={selectedTags}
        onChange={(tags) => {
          setSelectedTags(tags);
          clearError("taxonomy");
        }}
        error={fieldErrors.taxonomy}
      />

      <ServerError message={serverError} />

      <div className="flex items-center justify-between gap-3 pt-2">
        <a
          href={`/recipes/${recipe.id}`}
          className="text-sm text-blue-100/60 transition-colors hover:text-blue-100 hover:underline"
        >
          Cancel
        </a>
        <Button type="submit" disabled={submitting} className="min-w-36 bg-white/15 text-white hover:bg-white/25">
          <BookText className="size-4" />
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
