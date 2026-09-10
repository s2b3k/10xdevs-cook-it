import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CreateRecipeInput, Taxonomy, UUID } from "@/types";

interface TestDatabase {
  public: {
    Tables: {
      recipes: {
        Row: { id: UUID; user_id: UUID; title: string; ingredients: string; instructions: string };
        Insert: {
          user_id: UUID;
          title: string;
          lead?: string | null;
          ingredients: string;
          instructions: string;
          photo_url?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      taxonomy: {
        Row: { id: UUID; name: string; category: string | null; created_at: string };
        Insert: { name: string; category: string | null };
        Update: never;
        Relationships: [];
      };
      recipe_taxonomy: {
        Row: { recipe_id: UUID; taxonomy_id: UUID };
        Insert: { recipe_id: UUID; taxonomy_id: UUID };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

type TestClient = SupabaseClient<TestDatabase>;

export interface TestUser {
  client: TestClient;
  email: string;
  id: UUID;
  password: string;
}

interface TestRecipe {
  id: UUID;
  userId: UUID;
}

interface TestRelation {
  recipeId: UUID;
  taxonomyId: UUID;
}

export interface TestContext {
  admin: TestClient;
  users: [TestUser, TestUser];
  recipes: TestRecipe[];
  taxonomies: Taxonomy[];
  relations: TestRelation[];
  createRecipe(user: TestUser, input?: Partial<CreateRecipeInput>): Promise<TestRecipe>;
  createTaxonomy(user: TestUser, name?: string, category?: string | null): Promise<Taxonomy>;
  assignTaxonomy(user: TestUser, recipeId: UUID, taxonomyId: UUID): Promise<void>;
  cleanup(): Promise<void>;
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Integration tests require ${name}. Start local Supabase and export its test credentials.`);
  }
  return value;
}

function describeError(error: unknown): string {
  const formatValue = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const details = [record.message, record.code, record.status, record.name]
      .filter(Boolean)
      .map(formatValue)
      .join(" ");
    if (details) {
      return details;
    }
    const properties = Object.getOwnPropertyNames(error)
      .map((property) => `${property}=${formatValue(record[property])}`)
      .join(", ");
    return properties || error.constructor.name;
  }

  return String(error);
}

function createAnonClient(url: string, key: string): TestClient {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function createAdminClient(url: string, serviceRoleKey: string): TestClient {
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function createAuthenticatedUser(url: string, anonKey: string, admin: TestClient): Promise<TestUser> {
  const suffix = randomUUID();
  const email = `integration-${suffix}@example.test`;
  const password = `Test-${suffix}-password`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });

  if (error) {
    throw new Error(`Could not create integration test user: ${describeError(error)}`);
  }

  const client = createAnonClient(url, anonKey);
  const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Could not sign in integration test user: ${describeError(signInError)}`);
  }

  return { client, email, id: sessionData.user.id, password };
}

function recipeInput(overrides: Partial<CreateRecipeInput> = {}): CreateRecipeInput {
  const suffix = randomUUID();
  return {
    title: `Integration recipe ${suffix}`,
    ingredients: "Ingredient",
    instructions: "Instruction",
    ...overrides,
  };
}

/**
 * Creates authenticated fixtures and a privileged client reserved for cleanup
 * and final-state inspection. Authorization assertions must use user clients.
 */
export async function createTestContext(): Promise<TestContext> {
  const url = requireEnvironment("SUPABASE_URL");
  const anonKey = requireEnvironment("SUPABASE_KEY");
  const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createAdminClient(url, serviceRoleKey);
  const users = [
    await createAuthenticatedUser(url, anonKey, admin),
    await createAuthenticatedUser(url, anonKey, admin),
  ] as [TestUser, TestUser];
  const recipes: TestRecipe[] = [];
  const taxonomies: Taxonomy[] = [];
  const relations: TestRelation[] = [];

  async function createRecipe(user: TestUser, input: Partial<CreateRecipeInput> = {}): Promise<TestRecipe> {
    const values = recipeInput(input);
    const { data, error } = await user.client
      .from("recipes")
      .insert({
        user_id: user.id,
        title: values.title,
        lead: values.lead,
        ingredients: values.ingredients,
        instructions: values.instructions,
        photo_url: values.photoUrl,
      })
      .select("id, user_id")
      .single<{ id: UUID; user_id: UUID }>();

    if (error) {
      throw new Error(`Could not create integration test recipe: ${describeError(error)}`);
    }

    const recipe = { id: data.id, userId: data.user_id };
    recipes.push(recipe);
    return recipe;
  }

  async function createTaxonomy(
    user: TestUser,
    name = `Integration taxonomy ${randomUUID()}`,
    category: string | null = null,
  ): Promise<Taxonomy> {
    const { data, error } = await user.client
      .from("taxonomy")
      .insert({ name, category })
      .select("id, name, category, created_at")
      .single<{ id: UUID; name: string; category: string | null; created_at: string }>();

    if (error) {
      throw new Error(`Could not create integration test taxonomy: ${describeError(error)}`);
    }

    const taxonomy = { id: data.id, name: data.name, category: data.category, createdAt: data.created_at };
    taxonomies.push(taxonomy);
    return taxonomy;
  }

  async function assignTaxonomy(user: TestUser, recipeId: UUID, taxonomyId: UUID): Promise<void> {
    const { error } = await user.client
      .from("recipe_taxonomy")
      .insert({ recipe_id: recipeId, taxonomy_id: taxonomyId });

    if (error) {
      throw new Error(`Could not create integration test relation: ${error.message}`);
    }

    relations.push({ recipeId, taxonomyId });
  }

  /** Cleanup uses the service-role client because user clients cannot remove every fixture. */
  async function cleanup(): Promise<void> {
    const errors: string[] = [];

    for (const relation of relations) {
      const { error } = await admin
        .from("recipe_taxonomy")
        .delete()
        .match({ recipe_id: relation.recipeId, taxonomy_id: relation.taxonomyId });
      if (error) {
        errors.push(`relation ${relation.recipeId}/${relation.taxonomyId}: ${describeError(error)}`);
      }
    }
    for (const recipe of recipes) {
      const { error } = await admin.from("recipes").delete().eq("id", recipe.id);
      if (error) {
        errors.push(`recipe ${recipe.id}: ${describeError(error)}`);
      }
    }
    for (const taxonomy of taxonomies) {
      const { error } = await admin.from("taxonomy").delete().eq("id", taxonomy.id);
      if (error) {
        errors.push(`taxonomy ${taxonomy.id}: ${describeError(error)}`);
      }
    }
    for (const user of users) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) {
        errors.push(`user ${user.id}: ${describeError(error)}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Integration fixture cleanup failed: ${errors.join("; ")}`);
    }
  }

  return { admin, users, recipes, taxonomies, relations, createRecipe, createTaxonomy, assignTaxonomy, cleanup };
}
