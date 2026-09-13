# Landing Page and Subtle Styling — Plan Brief

> Full plan: `context/changes/landing-and-styling/plan.md`

## What & Why

The current root page is still an Astro starter landing with cosmic decoration and generic developer copy. This change turns it into a cook.it opener that explains the product clearly, keeps the cosmic direction in a more intentional form, and gives authenticated users a fluid path into their recipe workspace.

## Starting Point

`Welcome.astro` owns the current hero, background, CTA links, and starter feature cards. `/recipes` separately fetches the current user's recipes and renders the complete `RecipeSearch` workspace, protected by middleware. There is no existing parallax or reduced-motion implementation.

## Desired End State

Unauthenticated visitors see a focused cook.it hero with authentication CTAs and no private recipe data. Authenticated users see the same recipe workspace below the opener, with subtle CSS-first parallax and an automatic handoff to `/recipes` after reaching a configurable threshold in the recipe section.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Landing scope | Opener plus authenticated recipe workspace | Delivers the intended transition without adding unrelated marketing sections |
| Visual direction | Refined cosmic styling | Preserves the existing direction while making it product-specific and less starter-like |
| Authenticated content | Reuse the `/recipes` workspace | Prevents duplicate search behavior and keeps one user-facing contract |
| Unauthenticated content | Hero only | Avoids empty/private recipe states and protects user data |
| Motion | CSS-first parallax with static fallback | Keeps SSR lightweight and ensures usable behavior across devices |
| Handoff | Automatic navigation at a single configurable threshold, initially 60% | Preserves the desired opener feeling while keeping the trigger easy to tune |
| Navigation | Ordinary `/recipes` URL navigation | Lets existing middleware and the canonical route remain authoritative |

## Scope

**In scope:**

- Cook.it-specific landing copy and CTA hierarchy
- Refined cosmic background and hero styling
- Shared recipe workspace markup used by landing and `/recipes`
- Authenticated-only recipe section on the landing route
- CSS-first responsive parallax and reduced-motion/static fallback
- Configurable one-shot redirect threshold
- Focused lint, typecheck, build, existing test suite, and manual browser checks

**Out of scope:**

- Database, API, auth, or recipe-domain changes
- New recipe search features or detail-page redesign
- Public recipe data
- Broad landing-page visual snapshot coverage
- Analytics or a new brand system

## Architecture / Approach

The root SSR route resolves the current user and fetches that user's recipes only when authenticated. A shared Astro recipe workspace component renders the heading, warning, add action, and existing `RecipeSearch` island for both routes. `Welcome.astro` keeps the public hero and conditionally includes the workspace. CSS handles the parallax enhancement and static fallback; a small authenticated-only progressive-enhancement script observes the recipe section and navigates to `/recipes` once the named threshold is reached.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared workspace | Cook.it copy and one recipe workspace used by both routes | Divergence between landing and `/recipes` |
| 2. CSS-first motion | Refined cosmic opener with responsive/reduced-motion fallbacks | Scroll jank or inaccessible motion |
| 3. Handoff | Configurable authenticated redirect and final verification | Surprise navigation or auth leakage |

**Prerequisites:** Existing Supabase auth, recipe service, middleware, and `RecipeSearch` remain available.
**Estimated effort:** Approximately 2-3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- The authenticated landing section must fetch the same user-owned recipe data server-side rather than calling protected APIs from a public page.
- CSS scroll-driven effects may be unsupported in some browsers; the static background is the required fallback.
- Automatic navigation is intentionally limited to authenticated users and a single named threshold to keep behavior predictable and easy to tune.

## Success Criteria (Summary)

- Visitors immediately understand cook.it's purpose and can reach authentication.
- Authenticated users see the existing recipe workspace without duplicated implementation and arrive at canonical `/recipes` after the configured scroll threshold.
- Desktop, mobile, reduced-motion, back-navigation, lint, typecheck, tests, and build checks all pass.