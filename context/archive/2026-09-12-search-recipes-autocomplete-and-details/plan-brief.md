# Search Recipes Autocomplete and Details — Plan Brief

> Full plan: `context/changes/search-recipes-autocomplete-and-details/plan.md`
> Frame brief: `context/changes/_search-recipes-autocomplete-and-details/frame.md`
> Research: `context/changes/_search-recipes-autocomplete-and-details/frame.md` and repository exploration

## What & Why

S-02 lets an authenticated user quickly find an owned recipe by taxonomy and ingredient, then open its complete details. Taxonomy autocomplete remains open and user-extensible; ingredient search remains a case-insensitive fragment match over the existing text field. The filters use AND semantics so every supplied condition must be satisfied.

## Starting Point

S-01 already provides the recipe/taxonomy schema, RLS policies, services, JSON API conventions, taxonomy autocomplete, and authenticated recipe list. The remaining gaps are filtered recipe reads, an interactive search surface, result cards, and a server-rendered detail route.

## Desired End State

`/recipes` opens with the user's recipes and lets them select multiple taxonomy tags and enter an ingredient fragment. Results refresh automatically after debounce, show an explicit loading or empty state, and link to a full `/recipes/<id>` view containing the recipe content and taxonomy labels.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Filter endpoint | Extend `GET /api/recipes` | Preserves the existing list contract and avoids a second list endpoint. | Plan |
| Taxonomy selection | Multiple values with AND semantics | Matches the requirement that all supplied conditions qualify a result. | Frame / Plan |
| Result updates | Automatic debounce | Supports fast exploration while limiting request frequency. | Plan |
| Detail rendering | Astro SSR through the service layer | Matches the app architecture and keeps auth/RLS server-side. | Plan |
| Empty/error handling | Separate success-empty, service-error, and 404 states | Makes valid no-match searches distinct from failures. | Frame / Plan |
| Performance | Bounded results and measure first | Avoids speculative migrations while preserving the p95 target. | Plan |
| Automated coverage | Service/API integration plus one E2E flow | Protects the R6 search risk at its owning boundaries and verifies wiring. | Plan |

## Scope

**In scope:**

- Filtered user-owned recipe search by taxonomy IDs and ingredient fragment
- Existing taxonomy autocomplete reused for multiple selections
- Debounced search UI with loading, error, empty, and clear states
- Result cards linking to recipe details
- SSR recipe details with taxonomy labels and ownership-safe not-found behavior
- Integration tests, one Playwright flow, quality gates, and p95 timing check

**Out of scope:**

- Ingredient autocomplete or normalized ingredient entities
- Ranking, pagination, sharing, editing, deleting, or taxonomy administration
- Search indexes added without measured performance evidence

## Architecture / Approach

The existing `/recipes` Astro page loads the initial owned list and mounts a React search island. The island calls the extended `GET /api/recipes` with optional ingredient, repeated taxonomy IDs, and bounded limit parameters. The service applies all filters and RLS remains the ownership boundary. Result cards link to an Astro SSR dynamic route that loads the recipe and taxonomy labels server-side.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Search Service and API Contract | Filtered service reads, query validation, and API behavior | Incorrect AND/OR semantics or duplicate join rows |
| 2. Search UI and SSR Recipe Details | Debounced search, result cards, and complete detail page | Stale responses or unclear empty/error states |
| 3. Integration, E2E, and Performance Verification | Boundary tests, browser flow, quality gates, and timing evidence | Test fixtures or search cost fail at realistic data size |

**Prerequisites:** S-01 remains available, local Supabase is running for integration tests, and Playwright `auth.json` contains a valid authenticated state.

**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Ingredient substring search over unstructured text may need a future index if representative p95 exceeds 1.5 seconds.
- The detail view can load taxonomy labels through the existing Supabase boundary without introducing a new persistent model.
- The existing shared taxonomy model and case-insensitive deduplication remain valid for S-02.

## Success Criteria (Summary)

- Every filtered result satisfies every supplied taxonomy and ingredient condition, with no cross-account data.
- Valid no-match searches return a clear empty state rather than an error, while missing details produce a controlled 404.
- An authenticated user can complete the search-to-detail flow in the browser and the representative search meets the roadmap p95 target.
