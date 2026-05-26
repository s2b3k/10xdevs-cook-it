import type { PostgrestError } from "@supabase/supabase-js";

export const RECIPE_ERROR_CODES = {
  unauthorized: "RECIPE_UNAUTHORIZED",
  notFound: "RECIPE_NOT_FOUND",
  validation: "RECIPE_VALIDATION",
  conflict: "RECIPE_CONFLICT",
  integrity: "RECIPE_INTEGRITY",
  unknown: "RECIPE_UNKNOWN",
} as const;

export type RecipeErrorCode = (typeof RECIPE_ERROR_CODES)[keyof typeof RECIPE_ERROR_CODES];

export class RecipeDomainError extends Error {
  public readonly code: RecipeErrorCode;
  public readonly details?: unknown;

  constructor(code: RecipeErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "RecipeDomainError";
    this.code = code;
    this.details = details;
  }
}

export function mapSupabaseError(
  error: PostgrestError | null,
  fallbackCode: RecipeErrorCode = RECIPE_ERROR_CODES.unknown,
): RecipeDomainError | null {
  if (!error) {
    return null;
  }

  switch (error.code) {
    case "42501":
      return new RecipeDomainError(RECIPE_ERROR_CODES.unauthorized, "Access denied.", error);
    case "PGRST116":
      return new RecipeDomainError(RECIPE_ERROR_CODES.notFound, "Recipe was not found.", error);
    case "23505":
      return new RecipeDomainError(RECIPE_ERROR_CODES.conflict, "Resource already exists.", error);
    case "23503":
    case "23514":
      return new RecipeDomainError(
        RECIPE_ERROR_CODES.integrity,
        "Operation violates data integrity constraints.",
        error,
      );
    default:
      return new RecipeDomainError(fallbackCode, error.message || "Recipe operation failed.", error);
  }
}
