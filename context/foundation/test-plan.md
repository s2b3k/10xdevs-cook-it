# Test Rollout Plan: cook.it

Status vocabulary in §3 is parser-controlled and must remain in English.

## 1. Strategy

1. **Cost x signal.** Every test added by this rollout must answer: what is the cheapest test that gives a real signal for this risk? Do not promote a check to e2e because it feels safer, and do not add an AI-native layer where a deterministic test already catches the regression.
2. **User concerns are evidence.** The user's lived concerns carry the same weight as PRD, roadmap, and implementation-plan evidence.
3. **Risks are scenarios, not code locations.** This plan records failure scenarios and evidence, not file anchors or implementation knowledge. `/10x-research` must locate and verify the concrete failure paths for each rollout phase.

The first rollout must bootstrap a test runner because the project currently has no dedicated test infrastructure. Authentication is not a rollout priority: the product uses existing mechanisms and does not plan to extend them now. Data ownership and authorization at the recipe boundary remain in scope because they protect user data.

## 2. Risk Map

| #   | Risk (failure scenario)                                                                                                      | Impact | Likelihood | Source (evidence only)                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------- |
| R1  | The same tag is created in multiple spelling or casing variants, causing database growth and inconsistent search results.    | High   | High       | Phase 2 interview Q1; PRD FR-003, FR-004       |
| R2  | A recipe is saved without some tags or recipe data, while the user receives no trustworthy indication of the partial result. | High   | High       | Phase 2 interview Q1; S-01 implementation plan |
| R3  | A user can read or modify a recipe or taxonomy relation belonging to another account.                                        | High   | Medium     | PRD Access Control; F-01 implementation plan   |
| R4  | Client and server validation diverge, allowing invalid or excessive data into the database.                                  | Medium | Medium     | PRD FR-001, FR-003; S-01 implementation plan   |
| R5  | Recipe-taxonomy changes leave orphaned or invalid relations after an edge-case operation.                                    | Medium | Medium     | F-01 implementation plan: relation integrity   |
| R6  | Search by taxonomy and ingredient returns recipes that do not satisfy all query conditions, or handles text and empty-result edge cases inconsistently. | High   | Medium     | PRD US-01, FR-004, S-02 Search Contract; roadmap S-02 |

### Risk Response Guidance

| Risk | What would prove protection                                                                                   | Must challenge                                                  | Context needed                                                                                       | Likely cheapest layer                      | Anti-pattern to avoid                                             |
| ---- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| R1   | Equivalent tag inputs resolve to one canonical tag and do not create additional records.                      | A `200 OK` response proves deduplication.                       | Normalization rule, uniqueness constraint, conflict behavior, and source of truth for existing tags. | Integration with the database              | Testing only a normalizer without exercising database uniqueness. |
| R2   | Recipe creation and tag assignment have an explicit, observable result even when one assignment fails.        | Successful recipe creation means the whole operation succeeded. | Request sequence, persistence boundary, partial-failure contract, and user-visible warning behavior. | API/service integration                    | Happy-path-only coverage with no partial assignment failure.      |
| R3   | Account A cannot read or modify account B's recipe data or relations.                                         | Being logged in is sufficient authorization.                    | Ownership predicate, RLS behavior, request identity, and relation access path.                       | Database integration                       | Testing only one authenticated account.                           |
| R4   | The server rejects missing, malformed, and unexpected input independently of client-side validation.          | Form validation protects the API.                               | Server schema, normalization, accepted fields, error contract, and persistence constraints.          | API contract/integration                   | Copying implementation logic into expected test values.           |
| R5   | Edge-case relation operations preserve referential and uniqueness guarantees.                                 | A successful insert proves the model is consistent.             | Foreign keys, delete behavior, duplicate relation behavior, and domain error mapping.                | Database integration                       | Asserting only that a row exists.                                 |
| R6   | A result satisfies every supplied taxonomy and ingredient condition, uses the defined text matching rules, and exposes the expected empty-result contract. | Text similarity implies relevance. | Query semantics, AND/OR rules, open taxonomy behavior, ingredient text representation, trimming, case-insensitivity, empty results, ordering, and independent fixture oracle. | Service/API integration, then selected e2e | E2e tests without an independent expected-result source, or approximate fallback results that hide a broken AND filter. |

## 3. Phased Rollout

| #   | Phase                                    | Goal                                                                                            | Risks covered | Test types                                     | Status        | Change folder                          |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------- | ------------- | -------------------------------------- |
| 1   | Test foundation and data protection      | Establish the runner and prove data isolation and relation integrity before expanding coverage. | R3, R5        | Integration with Supabase/RLS                  | complete      | testing-foundation-and-data-protection |
| 2   | Recipe persistence and tag deduplication | Prove reliable recipe persistence, server validation, and canonical tag creation.               | R1, R2, R4    | API/service integration                        | complete      | testing-recipe-persistence-and-tag-deduplication |
| 3   | Search result correctness                | Prove that combined taxonomy and ingredient queries return only valid matches.                  | R6            | Service/API integration; selected e2e          | complete      | search-recipes-autocomplete-and-details |
| 4   | Quality gates                            | Make critical tests part of local and CI quality gates.                                         | R1-R6         | Test runner, lint, build, critical-flow checks | complete      | testing-quality-gates                  |

Phase order is risk-first: protect ownership and database integrity, then verify writes and deduplication, then verify the product's north-star search flow, and finally make the checks enforceable. No AI-native phase is proposed because the current risks have cheaper deterministic signals.

### Phase 3 edge cases

The search correctness rollout must cover these cases:

- taxonomy-only query returns only recipes with the selected taxonomy;
- ingredient-only query matches a non-empty fragment case-insensitively after trimming;
- taxonomy plus ingredient returns only the intersection of both filters;
- a query with no intersection returns a successful empty result, not an error or approximate match;
- empty or whitespace-only ingredient input does not create a restrictive ingredient predicate;
- equivalent taxonomy casing resolves to the same taxonomy value and does not create a duplicate option;
- ingredient autocomplete is out of scope for this rollout; tests cover the text input and result filtering instead.

## 4. Stack

- Application: Astro 6 SSR, React islands, TypeScript, Supabase, Cloudflare deployment.
- Existing quality gates: `npm run lint`, `npm run build`, and `npx astro sync`.
- Test-base profile: `none` — no test runner configuration and no test files were found.
- Main codebase scope for hotspot scan: `src/`.
- Hotspot scan: 0 commits in the last 30 days under `src/`; insufficient history. Likelihood therefore relies on the PRD, roadmap, implementation plans, and user interview.
- Authentication: existing mechanisms are accepted and not a rollout priority; recipe ownership and data isolation remain in scope.

**Stack grounding tools (current session):**

- Docs: not available in current session — recommendations use local manifest and repository rules; checked: 2026-09-10
- Search: not available in current session — no dedicated search MCP exposed; checked: 2026-09-10
- Runtime/browser: browser/runtime tools available — possible future e2e verification, not used for this plan; checked: 2026-09-10
- Provider/platform: GitHub and repository tooling available — CI relevance noted, not used for stack recommendations; checked: 2026-09-10

## 5. Quality Gates

| Gate              | Purpose                                                    | Current state                                         | Rollout requirement                                                                               |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Lint              | Catch type-aware and style regressions.                    | Present as `npm run lint`.                            | Keep required throughout.                                                                         |
| Type/build        | Verify Astro sync, TypeScript, and production compilation. | Present through `npx astro sync` and `npm run build`. | Keep required throughout.                                                                         |
| Unit/integration  | Catch domain, persistence, ownership, and API regressions. | Not configured.                                       | Required after Phase 1 and expanded through Phase 3.                                              |
| Critical-flow e2e | Verify only user-visible flows not covered cheaply below.  | Not configured.                                       | Required after Phase 3 only for the critical search flow if integration coverage is insufficient. |
| Post-edit hook    | Provide fast local feedback.                               | No dedicated test hook.                               | Recommended local improvement; not a CI substitute.                                               |

## 6. Cookbook

- Recipe ownership and relation integrity: Add tests in `src/lib/services/__tests__/recipe.service.integration.test.ts`, using `createTestContext()` from `src/lib/services/__tests__/helpers.ts` for two authenticated users and cleanup. Run with `npm run test:run` after starting local Supabase and setting `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Recipe persistence and partial tag assignment: `tests/recipe-mutation-api.spec.ts`, covering 4xx validation outcomes, persistence safety, and the warning redirect after partial assignment.
- Canonical taxonomy creation and duplicate prevention: `src/lib/services/__tests__/taxonomy.service.integration.test.ts`, covering equivalent writes, stable IDs, and unchanged row count against Supabase.
- Search by combined taxonomy and ingredient conditions, text matching, and empty-result behavior: `tests/search-recipes.spec.ts` and `src/lib/services/recipe.service.ts`, covering the Phase 3 edge-case list through API and selected browser assertions.
- Running critical tests with lint and build: Run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build`; run `npx playwright test` for browser coverage. These checks are enforced together in `.github/workflows/ci.yml` and require `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for integration and Playwright tests.

## 7. Negative Space

- Do not spend rollout budget on extending or replacing the existing login mechanism.
- Do not add broad visual snapshot coverage for non-critical or marketing pages.
- Do not test generated code or types as if they were product behavior.
- Do not promote simple validation or persistence checks to e2e when integration gives the same signal more cheaply.
- Do not add AI-native review or vision checks unless a later, evidence-based risk shows that deterministic tests cannot provide the required signal.
