# Landing Page and Subtle Styling Implementation Plan

## Overview

Replace the starter-oriented landing copy with a cook.it opener that keeps the existing cosmic visual language but makes the product purpose clear. Authenticated users will continue from the opener into the same recipe workspace used by `/recipes`, with a CSS-first parallax effect and an automatic, configurable handoff to `/recipes` after the user reaches the agreed scroll threshold. Unauthenticated users will see only the public hero and authentication calls to action.

## Current State Analysis

The root route in `src/pages/index.astro` renders `Welcome.astro` inside the shared SSR `Layout.astro`. `Welcome.astro` currently contains all landing structure, cosmic background layers, starter copy, authentication links, and three starter feature cards. `Topbar.astro` already receives `Astro.locals.user` and switches between authenticated and unauthenticated navigation.

The `/recipes` route independently fetches the signed-in user's recipes server-side and renders the heading, add-recipe action, warning state, and `RecipeSearch` React island. The route is protected by middleware, while the landing route is public. The recipe workspace should not be copied into a second implementation because its search behavior, empty state, and auth assumptions would drift.

There is no existing scroll-driven motion abstraction or reduced-motion rule. The test plan explicitly excludes broad visual snapshot coverage for non-critical marketing pages, so this change needs focused automated checks plus deliberate manual browser verification.

## Desired End State

The public landing page identifies cook.it, briefly explains that it helps users find and organize their own recipes, and retains clear sign-in/sign-up actions. The cosmic background feels intentional and restrained rather than like untouched starter content.

When a user is authenticated, the landing page renders the same recipe workspace content and interactions as `/recipes` below the opener. The opener uses CSS-first layered motion that degrades to a static background, works on desktop and mobile, and respects `prefers-reduced-motion`. Once the authenticated user reaches the configured percentage of the recipe section, the browser navigates to `/recipes`; unauthenticated users never receive or trigger this protected section.

### Key Discoveries:

- `src/pages/index.astro` is a thin SSR route that currently delegates all landing markup to `Welcome.astro`.
- `src/pages/recipes/index.astro` fetches user-owned recipes server-side and passes them to `RecipeSearch`.
- `src/middleware.ts` protects `/recipes` and redirects unauthenticated requests to `/auth/signin`.
- `RecipeSearch.tsx` is already a reusable React island, but its surrounding heading, empty state, and route-level data fetch also need to remain consistent.
- No existing parallax or `prefers-reduced-motion` implementation exists, so the motion must have an explicit static fallback.

## What We're NOT Doing

- No database, API, authentication, or recipe service changes.
- No redesign of the full recipe search interaction or recipe detail pages.
- No public exposure of recipe data.
- No new marketing sections, analytics, CMS, image upload, or brand system beyond the landing copy and styling needed for this opener.
- No broad visual snapshot suite for the landing page.
- No automatic redirect for unauthenticated users.

## Implementation Approach

Keep the landing route server-rendered and use `Astro.locals.user` as the authority for whether the recipe workspace exists. Move the shared recipe workspace markup into an Astro component that accepts the already-fetched recipe data and warning state; render it from both `Welcome.astro` and `/recipes/index.astro` so both routes retain one structure while their page-level data fetches remain appropriate to each request.

Keep the parallax implementation CSS-first: preserve server-rendered background layers, add stable data hooks and CSS scroll-driven positioning where supported, and define a static fallback for browsers without scroll-driven CSS and for reduced-motion users. Use a small progressive-enhancement script only for the authenticated redirect trigger, with a named threshold constant and cleanup/guarding so navigation cannot fire repeatedly.

## Critical Implementation Details

### User experience spec

The redirect threshold applies to the authenticated recipe section, not the viewport position of the top hero. The threshold must be represented by one named constant or equivalent data/config value so changing `60%` does not require rewriting the observer or navigation logic. Reduced-motion and unsupported-scroll-animation fallbacks must preserve the same content order and direct access to `/recipes`.

## Phase 1: Align Landing Content and Shared Recipe Workspace

### Overview

Replace starter copy with cook.it-specific content and extract the recipe workspace shell so the landing page and `/recipes` share the same heading, action, warning handling, and `RecipeSearch` mount.

### Changes Required:

#### 1. Shared recipe workspace component

**File**: `src/components/recipes/RecipeWorkspace.astro`

**Intent**: Create the single Astro-rendered wrapper for the authenticated recipe section, including the existing cookbook heading, add-recipe action, warning message, and `RecipeSearch` island.

**Contract**: Accept the server-fetched `Recipe[]` and optional warning string as props; keep `RecipeSearch` mounted with the existing `client:load` and `initialRecipes` contract.

#### 2. Recipes route integration

**File**: `src/pages/recipes/index.astro`

**Intent**: Preserve the route's current server-side auth and recipe fetch, but delegate the repeated workspace markup to `RecipeWorkspace.astro`.

**Contract**: Keep the protected route, `Recipes` document title, cosmic page shell, and existing user-visible behavior unchanged.

#### 3. Landing content and route data

**Files**: `src/components/Welcome.astro`, `src/pages/index.astro`

**Intent**: Update the public hero headline, supporting copy, labels, and feature content so the page describes cook.it's recipe retrieval and meal-planning value rather than the Astro starter. Make the landing route fetch the authenticated user's recipes only when a valid user and Supabase client are available, then pass them to the shared workspace.

**Contract**: Unauthenticated requests render the public hero and auth CTAs without recipe data or a recipe section; authenticated requests render the opener followed by `RecipeWorkspace` with that user's recipes.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes for the changed Astro components and route.
- `npm run typecheck` passes with the shared component props and authenticated data flow.
- `npm run build` completes successfully for the SSR Cloudflare target.

#### Manual Verification:

- An unauthenticated visit to `/` shows only the public cook.it opener and sign-in/sign-up actions.
- An authenticated visit to `/` shows the same recipe workspace content and empty state behavior as `/recipes`.
- `/recipes` retains its existing search, add-recipe, warning, and detail-navigation behavior.
- No recipe data is rendered for an unauthenticated request.

**Implementation Note**: After automated checks pass, pause for manual confirmation before starting Phase 2.

## Phase 2: Add Responsive CSS-First Opener Motion

### Overview

Refine the existing cosmic styling and add layered parallax behavior without turning the landing page into a heavy client-rendered experience.

### Changes Required:

#### 1. Cosmic opener styling

**Files**: `src/components/Welcome.astro`, `src/styles/global.css`

**Intent**: Preserve the cosmic direction selected during planning while reducing starter-template noise, improving visual hierarchy, and making the hero-to-recipe transition read as one opener. Keep responsive dimensions stable so text, CTAs, and the recipe section do not shift unexpectedly.

**Contract**: Use existing Tailwind 4 utilities and the `bg-cosmic` theme extension; keep decorative layers pointer-free and keep foreground content above the background layers.

#### 2. Progressive parallax behavior

**Files**: `src/components/Welcome.astro`, `src/styles/global.css`

**Intent**: Add named layer hooks and CSS-first scroll motion for the hero background. Provide a static layout fallback when scroll-driven animation is unavailable, on reduced-motion devices, or under the mobile constraints chosen during implementation.

**Contract**: The effect must not change document flow, block scrolling, or make content unreadable. Add an explicit `@media (prefers-reduced-motion: reduce)` override that disables motion while retaining all visual layers and content.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes after the CSS and Astro changes.
- `npm run typecheck` passes without introducing a React island or browser-global type error.
- `npm run build` completes with the parallax enhancement included in the SSR output.

#### Manual Verification:

- Desktop scrolling shows a subtle layered depth effect without visible jumps or scroll locking.
- Mobile scrolling remains usable and visually coherent, with no horizontal overflow or clipped CTA/content.
- Reduced-motion emulation renders the same opener without scroll-driven motion.
- Unsupported or disabled motion still leaves a complete, readable static landing page.

**Implementation Note**: After automated checks pass, pause for manual confirmation before starting Phase 3.

## Phase 3: Configurable Authenticated Handoff and Final Verification

### Overview

Add the authenticated-only automatic navigation at the recipe-section threshold, then verify the complete public and authenticated flows.

### Changes Required:

#### 1. Scroll threshold handoff

**File**: `src/components/Welcome.astro`

**Intent**: Add progressive-enhancement navigation that observes the authenticated recipe section and redirects to `/recipes` once the configured percentage threshold is reached.

**Contract**: Store the threshold as one clearly named, easily editable value (initially `0.6`); guard the behavior behind the authenticated rendering branch; ensure the observer disconnects after navigation and does not run on the public landing variant. The static page must remain usable if the script is unavailable.

#### 2. Focus, history, and navigation behavior

**Files**: `src/components/Welcome.astro`, `src/components/recipes/RecipeWorkspace.astro`

**Intent**: Make the transition predictable for keyboard and reduced-motion users and preserve ordinary browser navigation semantics.

**Contract**: Use a normal `/recipes` navigation so the destination URL is canonical and protected by existing middleware; do not expose recipe content before auth or replace the browser history in a way that prevents returning to the landing page.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test:run` passes without changing existing recipe/auth behavior.
- `npm run build` completes successfully.

#### Manual Verification:

- An authenticated user reaches the configured threshold in the recipe section and is redirected to `/recipes` exactly once.
- Changing the threshold constant changes the trigger point without changing the redirect logic.
- An unauthenticated user can scroll the entire public page without a redirect to `/recipes`.
- Browser back navigation returns to the landing route without a broken or partially hydrated state.
- Desktop and mobile checks confirm no layout overflow, motion jank, or accidental auth/data exposure.

**Implementation Note**: After this phase's automated checks pass, pause for manual confirmation of all browser scenarios before considering the change complete.

## Testing Strategy

### Unit Tests:

- No new unit test suite is required for the static content or CSS-first animation.
- If the redirect logic becomes a separately exported utility rather than a small page script, cover threshold comparison, one-shot navigation, and unauthenticated no-op behavior with focused tests.

### Integration Tests:

- Run the existing recipe and auth integration suite with `npm run test:run` to catch regressions in the shared recipe workspace and protected navigation.
- Do not add broad visual snapshots; the test plan classifies the landing page as non-critical for MVP validation.

### Manual Testing Steps:

1. Open `/` signed out at desktop width and verify the public hero, copy, CTAs, and absence of recipe content.
2. Sign in, open `/`, scroll through the opener and recipe section, and verify the automatic handoff to `/recipes` at the configured threshold.
3. Compare the authenticated landing recipe section with `/recipes`, including populated cards, empty state, warning state, search, and add-recipe navigation.
4. Repeat at a mobile viewport and with `prefers-reduced-motion: reduce` enabled.
5. Use browser back navigation and confirm the landing page can render again without duplicate redirects or stale content.

## Performance Considerations

Keep the hero motion CSS-first and avoid a continuous JavaScript scroll listener. The redirect enhancement should use an observer or equivalent threshold-based event, disconnect after firing, and avoid fetching recipe data on public requests. Existing recipe data loading and `RecipeSearch` hydration remain the dominant authenticated landing costs.

## Migration Notes

No database or data migration is required. Existing route protection, recipe ownership checks, and API contracts remain unchanged.

## References

- Landing route: `src/pages/index.astro`
- Current landing component: `src/components/Welcome.astro`
- Shared auth navigation: `src/components/Topbar.astro`
- Existing recipe route: `src/pages/recipes/index.astro`
- Existing search island: `src/components/recipes/RecipeSearch.tsx`
- Route protection: `src/middleware.ts`
- Global styling: `src/styles/global.css`
- Product context: `context/foundation/shape-notes.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Align Landing Content and Shared Recipe Workspace

#### Automated

- [ ] 1.1 `npm run lint` passes for the shared workspace and landing route
- [ ] 1.2 `npm run typecheck` passes
- [ ] 1.3 `npm run build` completes successfully

#### Manual

- [ ] 1.4 Public and authenticated landing variants behave correctly
- [ ] 1.5 `/recipes` retains existing workspace behavior

### Phase 2: Add Responsive CSS-First Opener Motion

#### Automated

- [ ] 2.1 `npm run lint` passes for styling changes
- [ ] 2.2 `npm run typecheck` passes
- [ ] 2.3 `npm run build` completes successfully

#### Manual

- [ ] 2.4 Desktop parallax remains subtle and scrollable
- [ ] 2.5 Mobile layout has no overflow or clipped content
- [ ] 2.6 Reduced-motion and static fallbacks disable motion safely

### Phase 3: Configurable Authenticated Handoff and Final Verification

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run typecheck` passes
- [ ] 3.3 `npm run test:run` passes
- [ ] 3.4 `npm run build` completes successfully

#### Manual

- [ ] 3.5 Authenticated threshold redirect fires once at the configured point
- [ ] 3.6 Unauthenticated landing never redirects to `/recipes`
- [ ] 3.7 Back navigation, mobile, and reduced-motion scenarios pass