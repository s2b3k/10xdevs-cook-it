---
change_id: recipe-domain-foundation
title: Fundament F-01 z roadmapy cook.it
status: implementing
created: 2026-05-26
updated: 2026-05-26
archived_at: null
---

## Notes

F-01 z @sym:# Roadmap: cook.it

Foundation delivered in this implementation cycle:

- Supabase migrations for recipes, taxonomy, join table, RLS policies, and core indexes.
- Domain contracts in src/types.ts.
- Service layer contract in src/lib/services/recipe.service.ts.
- Unified error model in src/lib/services/recipe.errors.ts.

Verification state:

- Passed: npx astro sync, npm run build.
- Passed: cloud migration dry-run on linked Supabase Cloud project (`npx supabase db push --dry-run --linked --yes`), with `supabase/migrations/README.md` intentionally skipped by CLI.
- Blocked by environment/repo state: global npm run lint currently fails on pre-existing CRLF issues outside this change.

Handoff readiness for S-01:

- Data model and service contracts are stable enough to start API endpoints and UI integration for recipe CRUD flows.
- Ownership boundaries are enforced in SQL/RLS and mirrored in service-level error mapping.
