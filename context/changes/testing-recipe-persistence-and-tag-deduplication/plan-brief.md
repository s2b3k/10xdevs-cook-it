# Recipe Persistence and Tag Deduplication - Plan Brief

> Full plan: `context/changes/testing-recipe-persistence-and-tag-deduplication/plan.md`
> Research: `context/changes/testing-recipe-persistence-and-tag-deduplication/research.md`

## What & Why

This change hardens and tests recipe persistence, tag deduplication, and server-side validation for rollout risks R1, R2, and R4. It makes the currently separate recipe-create and tag-assignment requests trustworthy: invalid writes are rejected, equivalent tags remain canonical, and partial assignment remains visible to the user.

## Starting Point

Recipe creation persists first and `AddRecipeForm` then assigns selected taxonomies through one request per tag. PostgreSQL already prevents case-insensitive duplicate taxonomies, but the conflict-recovery path, API validation boundaries, and partial-result behavior lack the required coverage.

## Desired End State

All recipe and taxonomy write routes consistently reject malformed, invalid, whitespace-only, and unknown input. Equivalent taxonomy requests return the same canonical record. If one assignment fails after recipe creation, successful state is retained and the user reaches the recipe list with the existing warning query signal.

## Key Decisions Made

| Decision                   | Choice                                        | Why (1 sentence)                                                                                   | Source          |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------- |
| Unknown write fields       | Reject with strict schemas                    | Prevents silent loss of unsupported client data and fulfills R4.                                   | Plan            |
| Assignment failures        | Typed `4xx` responses                         | Lets the form treat expected invalid-reference failures as a reliable partial result.              | Plan            |
| Initial creation atomicity | Retain partial-success workflow               | Matches current deliberate request boundaries without expanding this test rollout into a redesign. | Research / Plan |
| Partial-result assertion   | Redirect warning query plus database state    | Covers the client-visible contract without coupling a test to message wording.                     | Plan            |
| Test layers                | Supabase integration plus HTTP/browser checks | Exercises the database guarantee and route/form contracts at their cheapest reliable boundaries.   | Research / Plan |
| Invalid-input scope        | Full R4 matrix                                | Each malformed, normalized, UUID, unknown-key, and missing-reference case has distinct behavior.   | Research / Plan |

## Scope

**In scope:**

- Strict and normalized recipe/taxonomy write validation.
- Typed taxonomy-assignment route errors.
- Supabase-backed canonical taxonomy persistence test.
- Authenticated API negative-case coverage and one partial-assignment warning scenario.

**Out of scope:**

- Transactional create-and-assign workflow.
- Schema, RLS, UX-copy, CI, search, and broad e2e changes.

## Architecture / Approach

The server contract is aligned first at Zod and the taxonomy route. A Vitest integration test then proves `createOrGetTaxonomy()` against Postgres, while the existing Playwright mutation suite proves HTTP error semantics and the browser form's partial-success redirect using independent admin reads for persistence assertions.

## Phases at a Glance

| Phase                       | What it delivers                                      | Key risk                                               |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| 1. Validation and errors    | Strict input acceptance and typed assignment failures | Breaking callers that relied on ignored unknown fields |
| 2. Canonical persistence    | Real database proof of canonical taxonomy creation    | Leaking test fixtures or testing normalization only    |
| 3. API and partial outcomes | Full R4 matrix and warning redirect coverage          | Brittle browser setup or incomplete cleanup            |

**Prerequisites:** A configured Supabase project reachable over HTTP (local Docker Supabase is also supported); `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must target the same project; authenticated Playwright storage state in `auth.json` must be generated against that project.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Rejecting unknown fields is intentionally a backwards-incompatible API tightening; supported callers must send only documented fields.
- The warning redirect is the accepted user-facing signal; exact rendered warning copy remains deliberately outside the automated assertion.
- The local authenticated Playwright setup must be valid before running the partial-assignment scenario.

## Success Criteria (Summary)

- Equivalent taxonomy inputs resolve to one ID and one stored record under real database constraints.
- Invalid requests receive planned `4xx` responses and create no invalid data.
- A failed assignment after recipe creation retains the valid partial state and redirects with the warning signal.
