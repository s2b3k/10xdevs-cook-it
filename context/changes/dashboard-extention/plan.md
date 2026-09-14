# Add User Stats to Dashboard Implementation Plan

## Overview

Implement user-scoped statistics on the main authenticated dashboard page (`src/pages/dashboard.astro`). The dashboard will display total recipes created by the user and the total number of unique taxonomies (tags) applied across those recipes.

## Current State Analysis

- `src/pages/dashboard.astro` currently renders a simple welcome card with the user's email and a sign-out form.
- `src/lib/services/recipe.service.ts` provides recipe CRUD operations, but no aggregate statistics queries.
- Database tables `recipes`, `taxonomy`, and `recipe_taxonomy` have RLS enabled ensuring user isolation.

## Desired End State

Authenticated users visiting `/dashboard` see stat cards presenting:
1. **Total Recipes**: Number of recipes created by the logged-in user.
2. **Taxonomies Used**: Number of distinct taxonomies assigned to the user's recipes.

The stats are computed server-side via `createStatsService` during Astro SSR execution.

### Key Discoveries:

- `recipes` table contains `user_id` column indexed for user filtering (`supabase/migrations/20260526110001_create_recipes.sql`).
- `recipe_taxonomy` table maps `recipe_id` to `taxonomy_id` (`supabase/migrations/20260526110003_create_recipe_taxonomy.sql`).
- Existing integration testing pattern in `src/lib/services/__tests__/recipe.service.integration.test.ts` uses `createTestContext()` for isolated test user accounts.

## What We're NOT Doing

- Not adding global/system-wide taxonomy count.
- Not adding real-time polling or WebSocket updates.
- Not adding clickable stat filters or routing changes.

## Implementation Approach

1. **Type Definition & Service Layer**: Add `UserStats` interface in `src/types.ts` and create `src/lib/services/stats.service.ts` with `getUserStats()`.
2. **Service Integration Testing**: Create `src/lib/services/__tests__/stats.service.integration.test.ts` to test zero states, count calculation, and multi-user isolation.
3. **UI Integration**: Update `src/pages/dashboard.astro` to call `createStatsService(supabase, user.id).getUserStats()` and display the metrics in responsive, styled cards.

---

## Phase 1: Stats Service & Integration Testing

### Overview

Create the domain interface for user statistics, implement `StatsService` for querying user recipe and taxonomy counts from Supabase, and write integration tests.

### Changes Required:

#### 1. Type Definition

**File**: `src/types.ts`

**Intent**: Add `UserStats` interface to represent user activity metrics.

**Contract**:
```typescript
export interface UserStats {
  recipeCount: number;
  taxonomyCount: number;
}
```

#### 2. Stats Service

**File**: `src/lib/services/stats.service.ts`

**Intent**: Provide a service function `getUserStats()` to compute counts for a given user.

**Contract**:
```typescript
export interface StatsService {
  getUserStats(): Promise<UserStats>;
}

export function createStatsService(supabase: SupabaseClient, userId: UUID): StatsService;
```
- Query 1: Count user's recipes (`recipes` table where `user_id = userId` with `count: "exact", head: true`).
- Query 2: Retrieve `id` list of user's recipes, then query `recipe_taxonomy` for `taxonomy_id`s where `recipe_id` is in that list, returning the count of unique `taxonomy_id` values. If the user has 0 recipes, return `{ recipeCount: 0, taxonomyCount: 0 }` immediately.

#### 3. Integration Test

**File**: `src/lib/services/__tests__/stats.service.integration.test.ts`

**Intent**: Verify stats service counts correctly and respects user data isolation.

**Contract**:
- Tests empty state: user with 0 recipes gets `{ recipeCount: 0, taxonomyCount: 0 }`.
- Tests stats calculation: user with 2 recipes and 3 assigned taxonomies (with overlap) gets correct counts.
- Tests isolation: User A's recipes and taxonomies do not count towards User B's stats.

### Success Criteria:

#### Automated Verification:

- Type check passes: `npm run typecheck`
- Linting passes: `npm run lint`
- Stats service integration tests pass: `npm run test:run`

#### Manual Verification:

- N/A for backend service phase.

---

## Phase 2: Dashboard UI Extension

### Overview

Integrate `StatsService` into `src/pages/dashboard.astro` to display recipe and taxonomy stats cards for authenticated users.

### Changes Required:

#### 1. Dashboard Page Update

**File**: `src/pages/dashboard.astro`

**Intent**: Fetch stats in page frontmatter and render stat cards in a responsive grid layout.

**Contract**:
- Instantiate `createStatsService(createClient(Astro.request.headers, Astro.cookies), user.id)`.
- Fetch `getUserStats()`.
- Display stat cards below the welcome header:
  - Card 1: Total Recipes (`recipeCount`)
  - Card 2: Taxonomies Used (`taxonomyCount`)
- Use existing Tailwind aesthetic (`bg-cosmic`, `border-white/10`, `backdrop-blur-xl`, `from-blue-200 to-purple-200` gradients).

### Success Criteria:

#### Automated Verification:

- Type check passes: `npm run typecheck`
- Linting passes: `npm run lint`
- Build verification passes: `npm run build`

#### Manual Verification:

- User logging in to `/dashboard` sees exact recipe count and unique taxonomy count matching their database records.
- Styling is responsive and matches existing dashboard/cosmic aesthetic.

---

## Testing Strategy

### Unit / Integration Tests:

- `src/lib/services/__tests__/stats.service.integration.test.ts`
  - Empty state test (0 recipes, 0 taxonomies)
  - Single user with recipes & taxonomies (correct count & deduplication)
  - Data isolation across multiple user contexts

### Manual Testing Steps:

1. Log in as a user with recipes and taxonomies assigned.
2. Navigate to `/dashboard` and verify displayed counts.
3. Add a new recipe with tags, refresh `/dashboard`, and verify counts update.

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Stats Service & Integration Testing

#### Automated

- [x] 1.1 Type check passes: `npm run typecheck` — fc841af
- [x] 1.2 Linting passes: `npm run lint` — fc841af
- [x] 1.3 Stats service integration tests pass: `npm run test:run` — fc841af

### Phase 2: Dashboard UI Extension

#### Automated

- [x] 2.1 Type check passes: `npm run typecheck`
- [x] 2.2 Linting passes: `npm run lint`
- [x] 2.3 Build verification passes: `npm run build`

#### Manual

- [x] 2.4 User logging in to `/dashboard` sees exact recipe count and unique taxonomy count matching their database records.
- [x] 2.5 Styling is responsive and matches existing dashboard/cosmic aesthetic.
