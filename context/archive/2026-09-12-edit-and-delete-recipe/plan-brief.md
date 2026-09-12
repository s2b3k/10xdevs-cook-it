# Edit and Delete Recipe - Plan Brief

> Full plan: `context/changes/edit-and-delete-recipe/plan.md`

## What & Why

S-03 gives users control over the recipes they already own: they can correct recipe content, maintain taxonomy tags, and remove recipes they no longer want. The feature closes the data-hygiene gap left by recipe creation and protects trust through ownership checks, consistent errors, and explicit delete confirmation.

## Starting Point

Recipe creation, search, and SSR detail viewing already work. The service has basic update/delete methods, but there is no mutation API route, no edit form, no relation replacement operation, and no detail-page maintenance controls.

## Desired End State

From an owned recipe’s detail page, the user can open an edit form, change every editable field, replace the complete taxonomy set, and return to the updated detail view. The user can also confirm deletion, see the recipe disappear from the cookbook, and know shared taxonomy values were not removed.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Tag editing | Replace the complete tag set | Editing must support removing stale metadata as well as adding new tags. |
| Update API | `PATCH /api/recipes/:id` | It matches the existing resource mutation shape and supports a complete edit payload. |
| Save consistency | Server-side atomic update | One Save action should not leave recipe fields and tags out of sync. |
| Delete confirmation | Accessible in-page confirmation | Destructive actions need a clear, cancellable user decision. |
| Missing/non-owned resource | Uniform `404` | This preserves ownership privacy and matches existing detail behavior. |
| Action placement | Detail page only | Full recipe context keeps the list scannable and limits destructive controls. |
| Verification | Integration/API plus one focused E2E flow | Boundary tests cover data risks cheaply while one browser path protects wiring and UX. |

## Scope

**In scope:**

- Transactional update of recipe fields and taxonomy relations
- `PATCH` and `DELETE` API routes with strict validation and ownership-safe errors
- SSR edit page and detail-page actions
- Accessible delete confirmation and list redirect
- Service/API integration tests and one authenticated Playwright flow

**Out of scope:**

- Sharing, administration, ingredient modeling, search changes, uploads, and taxonomy management
- Conflict resolution or optimistic UI
- Broad browser coverage for cases already covered at service/API boundaries

## Architecture / Approach

The edit form sends a complete recipe representation and taxonomy ID set to the dynamic recipe API route. The user-scoped service calls a small Supabase transaction function that updates the owned recipe and replaces its relations together. The detail page owns the action surface; the edit page reuses existing form and taxonomy components; deletion relies on the existing recipe-relation cascade.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Transactional persistence | Atomic recipe and tag replacement plus strict delete behavior | Partial or cross-account writes |
| 2. Mutation API | Validated PATCH/DELETE resource contract | Leaky or inconsistent error mapping |
| 3. User experience | Edit page, detail actions, confirmation, redirects | Broken state or destructive UX |
| 4. Verification and handoff | Integration/API coverage and focused E2E flow | Regression hidden by isolated tests |

**Prerequisites:** Existing S-01/S-02 recipe flows, local Supabase credentials for integration tests, and authenticated Playwright state.

**Estimated effort:** ~2-3 sessions across 4 phases.

## Open Risks & Assumptions

- The transactional function must remain compatible with authenticated Supabase callers and RLS; integration tests are the gate for this assumption.
- Inline creation of a new taxonomy may occur before the recipe save, so an unused newly created taxonomy is acceptable and remains outside this slice’s rollback boundary.
- Concurrent edits remain last-confirmed-save-wins; conflict resolution is not part of MVP.

## Success Criteria (Summary)

- Users can edit all recipe fields and replace tags without a partial saved state.
- Users can delete only their own recipes after explicit confirmation, with a clear redirect.
- Automated and browser tests prove validation, ownership isolation, relation integrity, and the visible edit/delete workflow.
