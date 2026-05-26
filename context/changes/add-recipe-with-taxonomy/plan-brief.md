# Add Recipe with Taxonomy — Plan Brief

> Full plan: `context/changes/add-recipe-with-taxonomy/plan.md`

## What & Why

S-01 to pierwszy pionowy slice cook.it: użytkownik może dodać przepis (ręcznie lub copy-paste), przypisać tagi taksonomii i zobaczyć go na liście. Bez tego slice'a nie ma treści do wyszukania w S-02 (north star MVP).

## Starting Point

F-01 (recipe-domain-foundation) jest done: schema Supabase, RLS, `RecipeService` z `createRecipe/listRecipes/assignTaxonomy`, typy domenowe w `src/types.ts`. Brak API routes dla przepisów, brak stron `/recipes/*`, brak TaxonomyService.

## Desired End State

Zalogowany użytkownik otwiera `/recipes/new`, wypełnia tytuł, składniki, instrukcje, opcjonalny lead i link do zdjęcia, wybiera lub tworzy tagi taksonomii inline, zapisuje — i trafia na `/recipes` z kartą nowego przepisu. Cały flow mieści się w ≤ 90 s (guardrail PRD).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| API pattern | JSON fetch (nie formData + redirect) | Dynamiczny taxonomy UX wymaga React-controlled flow, nie natywnego form submit | Plan |
| Taxonomy creation | Inline create-on-enter (POST /api/taxonomy) | Baza tagów jest pusta na starcie — select-only uniemożliwiłby użycie | Plan |
| Taxonomy upsert | upsert/fallback select przy 23505 | Unique index na lower(name) gwarantuje że ten sam tag nie zduplikuje się | Plan |
| Walidacja | Zod server-side (nowa zależność) | Brak serwerowej walidacji kształtu danych byłby tech debtem od S-01 | Plan |
| Post-submit | Redirect na /recipes (prosta lista SSR) | Użytkownik musi zobaczyć efekt swojej pracy — stub bez listy jest bezużyteczny | Plan |
| Form scope | Wszystkie pola + photo_url | Unika tech debtu; photo_url jest prostym URL inputem, nie uploadem | Plan |
| Errors | Inline field errors + global banner | Formularz wielopolowy potrzebuje precyzyjnych komunikatów | Plan |

## Scope

**In scope:**
- `POST/GET /api/recipes` (JSON)
- `GET/POST /api/taxonomy` (autocomplete + create)
- `POST /api/recipes/[id]/taxonomy` (assign)
- `TaxonomyTagInput.tsx` (autocomplete chip input)
- `AddRecipeForm.tsx` (full form z JSON submit)
- `/recipes` (SSR lista: title + lead)
- `/recipes/new` (form page)
- Middleware: `/recipes` → PROTECTED_ROUTES

**Out of scope:**
- Edycja i usuwanie przepisu (S-03)
- Strona szczegółów `/recipes/[id]` (S-02)
- Wyszukiwanie i autocomplete po składnikach (S-02)
- Upload zdjęć (PRD Non-Goal)
- Zarządzanie kategoriami taksonomii

## Architecture / Approach

React form wysyła JSON do Astro SSR API routes, które walidują zod schematem i delegują do domain services (RecipeService + nowy TaxonomyService). Tag creation przez TaxonomyService z upsert semantics. Assign tagów po sukcesie recipe create. Redirect SSR na `/recipes` po zapisie.

```
AddRecipeForm.tsx
  └─ POST /api/recipes        → RecipeService.createRecipe()
  └─ POST /api/recipes/[id]/taxonomy → RecipeService.assignTaxonomy()

TaxonomyTagInput.tsx
  └─ GET  /api/taxonomy?q=    → TaxonomyService.searchTaxonomy()
  └─ POST /api/taxonomy       → TaxonomyService.createOrGetTaxonomy()
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. API Backend | JSON routes, zod validation, taxonomy service | Upsert logic dla taxonomy unique constraint |
| 2. Pages & React Components | Form, tag input, list page, routing | Taxonomy UX (debounce, create flow, chips) |
| 3. Integration Verification | Lint + build + E2E manual test | Regresja w auth flow |

**Prerequisites:** F-01 wdrożony (migracje na cloud: `npx supabase db push --linked`)
**Estimated effort:** ~2 sesje, 3 fazy

## Open Risks & Assumptions

- Assign tagów nie jest transakcyjny client-side — błąd przypisania pojedynczego tagu nie cofa przepisu (acceptable for MVP)
- Baza taxonomy jest shared między użytkownikami — każdy auth user może tworzyć tagi (per RLS z F-01)
- `src/pages/api/recipes/[id]/taxonomy.ts` jako dynamic Astro route działa w SSR mode bez getStaticPaths — potwierdzone przez dokumentację Astro

## Success Criteria (Summary)

- Użytkownik dodaje przepis z tagami w ≤ 90 s i widzi go natychmiast na `/recipes`
- Duplikaty tagów (case-insensitive) nie tworzą nowych rekordów w taxonomy
- Brak regresji w istniejących przepływach auth
