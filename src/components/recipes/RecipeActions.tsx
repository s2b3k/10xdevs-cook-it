import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";

const actionButtonClass = "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white";

interface RecipeActionsProps {
  recipeId: string;
}

export default function RecipeActions({ recipeId }: RecipeActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to delete recipe.");
      }
      window.location.href = "/recipes";
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete recipe.");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="space-y-3 rounded-xl border border-red-300/25 bg-red-500/10 p-4" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-200" aria-hidden="true" />
          <div>
            <p className="font-medium text-red-100">Delete this recipe?</p>
            <p className="mt-1 text-sm text-red-100/70">This action cannot be undone.</p>
          </div>
        </div>
        <ServerError message={error} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={actionButtonClass}
            disabled={deleting}
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
            <Trash2 className="size-4" />
            {deleting ? "Deleting..." : "Delete recipe"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className={actionButtonClass}
        aria-label="Edit recipe"
        onClick={() => {
          window.location.href = `/recipes/${recipeId}/edit`;
        }}
      >
        <Pencil className="size-4" />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        className={actionButtonClass}
        onClick={() => {
          setConfirming(true);
          setError(null);
        }}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  );
}
