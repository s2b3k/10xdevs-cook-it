import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createTaxonomyService } from "@/lib/services/taxonomy.service";
import { createTestContext, type TestContext } from "./helpers";

describe("taxonomy service persistence", () => {
  let context: TestContext | undefined;

  afterEach(async () => {
    await context?.cleanup();
    context = undefined;
  });

  it("returns one canonical taxonomy for equivalent writes", async () => {
    context = await createTestContext();
    const service = createTaxonomyService(context.users[0].client);
    const name = `Canonical taxonomy ${randomUUID()}`;
    const category = `Category ${randomUUID()}`;

    const first = await service.createOrGetTaxonomy({ name, category });
    context.taxonomies.push(first.taxonomy);

    const second = await service.createOrGetTaxonomy({
      name: `  ${name.toUpperCase()}  `,
      category: `  ${category.toUpperCase()}  `,
    });

    expect(first.isNew).toBe(true);
    expect(second).toMatchObject({ taxonomy: { id: first.taxonomy.id }, isNew: false });

    const { count, error } = await context.admin
      .from("taxonomy")
      .select("id", { count: "exact", head: true })
      .ilike("name", name)
      .ilike("category", category);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });
});