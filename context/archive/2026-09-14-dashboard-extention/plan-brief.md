# Add User Stats to Dashboard — Plan Brief

> Full plan: `context/changes/dashboard-extention/plan.md`

## What & Why

Add user-scoped statistics to the authenticated dashboard view (`src/pages/dashboard.astro`). The dashboard will display total recipes owned by the logged-in user and the count of unique taxonomies/tags used across those recipes to give users immediate feedback on their recipe library activity.

## Starting Point

Today, `src/pages/dashboard.astro` is a minimal placeholder page displaying only the user's email, a welcome message, and a sign-out button. Recipe and taxonomy data services already exist in `src/lib/services/recipe.service.ts` and `src/lib/services/taxonomy.service.ts`, but there is no dedicated service or query for aggregate user statistics.

## Desired End State

When an authenticated user lands on `/dashboard`, they see two styled stat cards below the welcome header: one showing the count of recipes they own and another showing the count of unique taxonomies assigned to their recipes. The data is retrieved server-side (SSR) during page render.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope | User-scoped recipes count & unique taxonomies used | Focuses on personal user activity and library usage. | Plan |
| Data Fetching | Dedicated Stats Service (SSR) | Fast count queries executed server-side without client spinners or UI flicker. | Plan |
| UI Layout | Stat cards grid below welcome message | Consistent with existing cosmic UI theme and RecipeCard styling. | Plan |

## Scope

**In scope:**
- `UserStats` TypeScript interface in `src/types.ts`.
- `StatsService` interface and `createStatsService(supabase, userId)` implementation in `src/lib/services/stats.service.ts`.
- Integration test for `stats.service.ts` verifying user isolation and count calculation.
- Render stat cards on `src/pages/dashboard.astro` using SSR.

**Out of scope:**
- Global/system-wide taxonomy count.
- Interactive filtering or navigation actions from stat cards.
- Client-side polling or real-time WebSocket updates.

## Architecture / Approach

- **Backend / Service:** `createStatsService` uses Supabase client with `count: "exact", head: true` for recipes owned by `user_id`. For taxonomies, it fetches the user's recipe IDs and counts unique `taxonomy_id` entries from `recipe_taxonomy`.
- **Frontend / SSR:** `src/pages/dashboard.astro` initializes `StatsService` inside frontmatter, fetches stats via SSR, and renders two styled stat cards.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Stats Service & Tests | `StatsService` implementation + integration tests | Ensuring correct zero-handling and user isolation in queries |
| 2. Dashboard UI Integration | Stat cards rendered on `src/pages/dashboard.astro` | Visual regression or broken SSR handling |

**Prerequisites:** Database schema (`recipes`, `taxonomy`, `recipe_taxonomy` tables exist with RLS policies enabled)
**Estimated effort:** ~1 session across 2 phases

## Open Risks & Assumptions

- Assumes existing RLS policies allow authenticated users to count their own recipes and recipe_taxonomy rows.

## Success Criteria (Summary)

- `npm run test:run` passes, including new integration tests for `StatsService`.
- Authenticated user viewing `/dashboard` sees exact count of their recipes and unique tags used.
