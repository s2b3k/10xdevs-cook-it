# Add Recipe with Taxonomy (S-01) Implementation Plan

## Overview

Implementacja pionowego slice'a S-01: użytkownik może dodać przepis ręcznie lub metodą kopiuj-wklej, uzupełnić podstawowe metadane taksonomiczne i zobaczyć swój przepis na liście. Fundament F-01 (schema, RLS, RecipeService) jest gotowy i nie zmienia się w tym sliceu.

## Current State Analysis

- **F-01 done**: migracje Supabase wdrożone (cloud dry-run), `RecipeService` z `createRecipe/listRecipes/assignTaxonomy`, typy domenowe w `src/types.ts`, błędy domenowe w `src/lib/services/recipe.errors.ts`.
- **Brak API routes dla przepisów**: `src/pages/api/` ma wyłącznie auth routes.
- **Brak stron recipe**: `src/pages/recipes/` nie istnieje.
- **Brak TaxonomyService**: `assignTaxonomy` jest w RecipeService, ale `searchTaxonomy` i `createTaxonomy` nie istnieją.
- **Wzorzec API**: istniejące routes (auth) używają `formData()` + redirect. Ten slice wprowadza nowy wzorzec: JSON body + JSON response.
- **Brak zod**: projekt nie ma biblioteki walidacji serwerowej.
- **Wzorzec React form**: `SignUpForm.tsx` — multi-hook `useState`, inline field errors, `cn()` do klas, komponenty `FormField`, `SubmitButton`, `ServerError`.

## Desired End State

Zalogowany użytkownik otwiera `/recipes/new`, wypełnia formularz (tytuł, lead, składniki, instrukcje, link do zdjęcia, tagi taksonomii), zapisuje przepis i trafia na `/recipes` gdzie widzi kartę swojego nowego przepisu. Walidacja serwerowa odrzuca brakujące wymagane pola ze zrozumiałym komunikatem. Tagi można wybierać z istniejących lub tworzyć nowe inline (autocomplete + create-on-enter).

### Key Discoveries

- `createClient(request.headers, cookies)` z `src/lib/supabase.ts` tworzy klienta Supabase z sesją użytkownika — identyczny pattern w API routes.
- `context.locals.user` (z middleware) daje `userId` bez dodatkowego zapytania auth.
- `RecipeService.assignTaxonomy(recipeId, taxonomyId)` — oba argumenty muszą być UUID istniejących rekordów w DB; taxonomy musi istnieć przed przypisaniem.
- Taxonomy table ma unikalny index na `(lower(name), coalesce(lower(category), ''))` — create-on-enter może trafić na conflict (23505); API powinno upsertować lub obsłużyć conflict gracefully.
- Astro SSR dynamic routes (`/api/recipes/[id]/taxonomy.ts`) nie wymagają `getStaticPaths` przy `output: "server"`.

## What We're NOT Doing

- Brak edycji i usuwania przepisu (S-03).
- Brak wyszukiwania i autocomplete po składnikach (S-02).
- Brak strony szczegółów przepisu `/recipes/[id]` (S-02).
- Brak paginacji na liście (S-02).
- Brak upload zdjęć — tylko opcjonalny link (URL).
- Brak zarządzania kategoriami taksonomii — pole `category` tagu jest opcjonalne i nie jest eksponowane w UI S-01.

## Implementation Approach

Trójfazowy slice backend-first: najpierw API (z zod), potem UI (Astro page + React components), na koniec weryfikacja end-to-end.

**API pattern** (nowy precedens): `Content-Type: application/json` request body, odpowiedź JSON `{data}` lub `{error, fields?}`. Brak formData.

**Taxonomy inline creation**: tag tworzony przez POST /api/taxonomy w momencie gdy użytkownik naciska Enter w TaxonomyTagInput (natychmiastowy feedback, tag pojawia się jako chip z prawdziwym ID). Assign następuje dopiero po sukcesie POST /api/recipes.

**Walidacja**: zod schema w API route; klient-side w React (sprawdzenie wymaganych pól przed fetch).

## Critical Implementation Details

**Taxonomy upsert on conflict**: taxonomy table ma unique constraint na `(lower(name), coalesce(lower(category), ''))`. Jeśli użytkownik tworzy tag który już istnieje (pisownia różna, ale lower() taka sama), API powinno zwrócić istniejący rekord zamiast błędu. Użyj Supabase `upsert` z `onConflict: 'name'` lub obsłuż error code `23505` w taxonomy service zwracając istniejący rekord.

**Sequential assigns after recipe create**: przypisanie tagów do przepisu musi nastąpić po sukcesie create, bo `recipe_id` jest znane dopiero wtedy. Błąd przypisania pojedynczego tagu nie powinien blokować pokazania sukcesu — pokaż warning, ale nie cofaj przepisu (brak transakcji client-side).

---

## Phase 1: API Backend

### Overview

Instalacja zod, taxonomy service, JSON API routes dla recipe CRUD i taxonomy management.

### Changes Required

#### 1. Zod dependency

**File**: `package.json` (via terminal: `npm install zod`)

**Intent**: Dodać bibliotekę walidacji serwerowej. Zod będzie używany wyłącznie w API routes (server-side) do walidacji kształtu JSON body.

**Contract**: Po instalacji `import { z } from "zod"` działa w plikach `.ts`.

#### 2. Zod schemas

**File**: `src/lib/schemas/recipe.schemas.ts`

**Intent**: Scentralizowane schematy walidacji dla wszystkich API routes tego slice'a.

**Contract**: Export trzech schematów — `CreateRecipeBodySchema` (title required string, lead/ingredients/instructions required strings, photoUrl optional string URL or null), `CreateTaxonomyBodySchema` (name required string, category optional string), `AssignTaxonomyBodySchema` (taxonomyId required UUID string).

#### 3. Taxonomy service

**File**: `src/lib/services/taxonomy.service.ts`

**Intent**: Warstwa serwisowa dla operacji na tabeli `taxonomy` — wyszukiwanie (dla autocomplete) i tworzenie (z obsługą duplikatów).

**Contract**: Export `createTaxonomyService(supabase: SupabaseClient)` zwracający `{ searchTaxonomy(query: string, limit?: number): Promise<Taxonomy[]>, createOrGetTaxonomy(input: CreateTaxonomyInput): Promise<Taxonomy> }`. `createOrGetTaxonomy` używa Supabase `upsert` z `onConflict` lub fallback select przy `23505` — zawsze zwraca rekord, nigdy nie rzuca conflict error.

#### 4. API: POST /api/recipes + GET /api/recipes

**File**: `src/pages/api/recipes/index.ts`

**Intent**: Endpoint do tworzenia przepisu (POST) i listowania przepisów zalogowanego użytkownika (GET). Oba zwracają JSON.

**Contract**:
- `GET` — odpowiedź `{ data: Recipe[] }` lub `{ error: string }` z HTTP 401 gdy brak auth.
- `POST` — body JSON walidowane przez `CreateRecipeBodySchema`; odpowiedź `{ data: Recipe }` (201) lub `{ error: string, fields?: Record<string,string> }`. Używa `createRecipeService(supabase, userId).createRecipe(input)`. Przy błędzie domenowym z `RecipeDomainError.code === 'RECIPE_VALIDATION'` zwraca 400 z `fields`.

#### 5. API: GET /api/taxonomy + POST /api/taxonomy

**File**: `src/pages/api/taxonomy/index.ts`

**Intent**: Autocomplete (GET z query param `?q=`) i tworzenie nowego tagu (POST).

**Contract**:
- `GET` — query param `q` (string, opcjonalny), odpowiedź `{ data: Taxonomy[] }`. Gdy brak auth: 401.
- `POST` — body JSON walidowany przez `CreateTaxonomyBodySchema`; wywołuje `createOrGetTaxonomy`; odpowiedź `{ data: Taxonomy }` (201 gdy nowy, 200 gdy istniejący).

#### 6. API: POST /api/recipes/[id]/taxonomy

**File**: `src/pages/api/recipes/[id]/taxonomy.ts`

**Intent**: Przypisanie istniejącego tagu taksonomii do konkretnego przepisu.

**Contract**: `POST` — `context.params.id` jako `recipeId`; body JSON walidowany przez `AssignTaxonomyBodySchema`; wywołuje `RecipeService.assignTaxonomy(recipeId, taxonomyId)`; odpowiedź `{}` (204/200) lub `{ error: string }`.

### Success Criteria

#### Automated Verification

- Type-checking passes: `npx astro sync && npx tsc --noEmit`
- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification

- `POST /api/recipes` z poprawnym JSON body i sesją auth → 201 + `{data: Recipe}`
- `POST /api/recipes` bez wymaganych pól → 400 + `{error, fields}`
- `GET /api/taxonomy?q=kur` → lista tagów zawierających "kur"
- `POST /api/taxonomy` z nową nazwą → 201; ten sam request ponownie → 200 (upsert, brak 409)

**Implementation Note**: Po zakończeniu tej fazy i weryfikacji automated, zatrzymaj się na manualnym teście API (np. curl lub Postman) przed Phase 2.

---

## Phase 2: Pages and React Components

### Overview

Strona listy przepisów (`/recipes`), strona formularza (`/recipes/new`) oraz komponenty React: `TaxonomyTagInput` (autocomplete + create-on-enter) i `AddRecipeForm` (pełny formularz z JSON submit).

### Changes Required

#### 1. Middleware: protect /recipes

**File**: `src/middleware.ts`

**Intent**: Dodać `/recipes` do `PROTECTED_ROUTES`, żeby niezalogowani użytkownicy byli przekierowywani na sign-in.

**Contract**: `PROTECTED_ROUTES` zmienia się z `["/dashboard"]` na `["/dashboard", "/recipes"]`.

#### 2. Strona listy: /recipes

**File**: `src/pages/recipes/index.astro`

**Intent**: SSR strona wyświetlająca listę przepisów zalogowanego użytkownika — tytuł i lead każdego przepisu jako karta. Zawiera przycisk "Dodaj przepis" prowadzący do `/recipes/new`.

**Contract**: Frontmatter pobiera przepisy przez `createRecipeService(supabase, userId).listRecipes()`. Gdy lista pusta — komunikat zachęcający do dodania pierwszego przepisu. Każda karta ma tytuł + lead (lub placeholder gdy brak) i nie jest klikalny w S-01 (link do szczegółów dodaje S-02).

#### 3. Strona formularza: /recipes/new

**File**: `src/pages/recipes/new.astro`

**Intent**: Prosta SSR strona opakowująca `AddRecipeForm` — przekazuje tylko to co serwer może dać: brak propsów z danych (formularz jest pusty na start).

**Contract**: Renderuje `<AddRecipeForm client:load />` wewnątrz `<Layout title="Nowy przepis">`. Brak server-side fetch — formularz zarządza swoim stanem klientowo.

#### 4. Komponent: TaxonomyTagInput

**File**: `src/components/recipes/TaxonomyTagInput.tsx`

**Intent**: Kontrolowany input do zarządzania tagami taksonomii — pokazuje wybrane tagi jako chip-y, filtruje istniejące tagi przez debounced fetch, pozwala tworzyć nowe tagi przez Enter/klik "Utwórz".

**Contract**: Props `{ value: Taxonomy[], onChange: (tags: Taxonomy[]) => void, error?: string }`. Wewnętrznie: text state dla inputa, dropdown state (lista `Taxonomy[]` z `GET /api/taxonomy?q=`), debounce ~300ms. Gdy Enter i tekst pasuje do istniejącego: dodaj tag. Gdy Enter i tekst nie pasuje: `POST /api/taxonomy` → dodaj zwrócony tag do `value` i wyczyść input. Chip ma × do usunięcia.

#### 5. Komponent: AddRecipeForm

**File**: `src/components/recipes/AddRecipeForm.tsx`

**Intent**: Główny formularz przepisu — zarządza stanem wszystkich pól, robi client-side pre-validation, wysyła JSON do API, obsługuje odpowiedzi (inline errors, sukces-redirect).

**Contract**: Props `{}` (brak — standalone). State: pola formularza + `selectedTags: Taxonomy[]` + `fieldErrors: Record<string, string>` + `serverError: string | null` + `submitting: boolean`. Submit flow: POST `/api/recipes` → dostaje `{data: {id}}` → sekwencyjnie POST `/api/recipes/{id}/taxonomy` dla każdego tagu → `window.location.href = '/recipes'`. Przy błędzie walidacji: mapuje `fields` na `fieldErrors`, wyświetla inline. Przy nieoczekiwanym błędzie: `serverError` banner. Używa istniejących `FormField`, `SubmitButton`, `ServerError` z komponentów auth.

### Success Criteria

#### Automated Verification

- Type-checking passes: `npx astro sync && npx tsc --noEmit`
- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification

- Otwórz `/recipes` bez logowania → redirect na `/auth/signin`
- Zaloguj się, otwórz `/recipes` → pusta lista z przyciskiem "Dodaj przepis"
- Kliknij "Dodaj przepis" → `/recipes/new` z formularzem
- Spróbuj zapisać bez tytułu → inline error pod polem "Tytuł"
- Wypełnij formularz, wpisz tag w TaxonomyTagInput, naciśnij Enter → chip pojawia się
- Wpisz ten sam tag ponownie → upsert, ten sam chip (brak duplikatu)
- Wyślij formularz → redirect na `/recipes` z kartą nowego przepisu

**Implementation Note**: Zatrzymaj się na manualnym teście pełnego flow przed Phase 3.

---

## Phase 3: Integration Verification

### Overview

Końcowa weryfikacja jakości: lint, build, i potwierdzenie że nie ma regresji w istniejących przepływach auth.

### Changes Required

Brak nowych zmian w kodzie w tej fazie — wyłącznie weryfikacja.

### Success Criteria

#### Automated Verification

- Lint clean: `npm run lint`
- Build clean: `npm run build`
- Astro sync clean: `npx astro sync`

#### Manual Verification

- Istniejące przepływy auth (sign-in, sign-up, sign-out) działają bez regresji
- Cały flow S-01: dodanie przepisu z tagami taksonomii widoczne na liście

**Implementation Note**: Po pozytywnej weryfikacji Phase 3 slice S-01 jest gotowy do merge'u.

---

## Testing Strategy

### Unit Tests

Brak dedykowanego test runnera w projekcie. Testowanie przez lint + build + manual E2E.

### Integration Tests

- POST /api/recipes → recipe w DB z user_id = zalogowany user
- POST /api/taxonomy (duplikat) → 200 z istniejącym rekordem, nie 409
- POST /api/recipes/{id}/taxonomy → rekord w recipe_taxonomy

### Manual Testing Steps

1. Dodaj przepis bez żadnych tagów — sukces, karta na liście
2. Dodaj przepis z 3 istniejącymi tagami (stwórz wcześniej) — wszystkie przypisane
3. Dodaj przepis z 1 nowym tagiem (create-on-enter) — tag stworzony i przypisany
4. Wyślij formularz bez tytułu — inline error "Tytuł jest wymagany"
5. Otwórz `/recipes` bez logowania — redirect na `/auth/signin`

## Performance Considerations

- `GET /api/taxonomy?q=` ograniczone do 20 wyników (LIMIT w zapytaniu Supabase) — autocomplete nie pobiera całej tabeli.
- Lista przepisów na `/recipes` bez paginacji — akceptowalne dla MVP (oczekiwany rozmiar: < 100 przepisów na użytkownika w fazie walidacji).

## References

- F-01 plan: `context/changes/recipe-domain-foundation/plan.md`
- Domain types: `src/types.ts`
- Recipe service: `src/lib/services/recipe.service.ts`
- Error model: `src/lib/services/recipe.errors.ts`
- Auth API pattern: `src/pages/api/auth/signup.ts`
- Auth React form pattern: `src/components/auth/SignUpForm.tsx`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: API Backend

#### Automated

- [x] 1.1 Type-checking passes after API routes added (`npx astro sync && npx tsc --noEmit`) — 5c90403
- [x] 1.2 Lint passes for new files (`npm run lint`) — 5c90403
- [x] 1.3 Build passes (`npm run build`) — 5c90403

#### Manual

- [ ] 1.4 POST /api/recipes z poprawnym body i sesją zwraca 201 + Recipe
- [ ] 1.5 POST /api/taxonomy z duplikatem zwraca 200 (upsert, brak 409)

### Phase 2: Pages and React Components

#### Automated

- [ ] 2.1 Type-checking passes after components added
- [ ] 2.2 Lint passes
- [ ] 2.3 Build passes

#### Manual

- [ ] 2.4 Pełny flow dodania przepisu z tagami — redirect na `/recipes` z kartą
- [ ] 2.5 Formularz bez tytułu — inline field error widoczny

### Phase 3: Integration Verification

#### Automated

- [ ] 3.1 Lint clean (`npm run lint`)
- [ ] 3.2 Build clean (`npm run build`)

#### Manual

- [ ] 3.3 Istniejące przepływy auth działają bez regresji
- [ ] 3.4 Cały flow S-01 end-to-end potwierdzony
