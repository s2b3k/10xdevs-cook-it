# Repository Guidelines

This repository is a server-rendered Astro 6 web app with React islands, TypeScript, Tailwind 4, Supabase auth, and Cloudflare deployment. Use this file as the first-pass operating guide, then follow deeper references in @README.md and @CLAUDE.md.

## Hard Rules First

- Preserve the workflow artifacts under @context/; do not overwrite or delete them during feature work.
- Keep Astro SSR behavior intact: pages are server-rendered and API handlers must follow the repo pattern in @src/pages/api/ with uppercase HTTP exports.
- Use the class merge helper from @src/lib/utils (cn()); do not manually concatenate Tailwind class strings.
- For interactive UI, use React components under @src/components/; keep static structure in Astro files under @src/pages/ and @src/layouts/.
- Do not introduce Next.js directives or conventions; this project is Astro-first.

## Build, Test, and Development Commands

- `npm run dev` starts local development.
- `npm run lint` runs the main code-quality gate.
- `npm run lint:fix` applies auto-fixes for lint issues.
- `npm run typecheck` validates the TypeScript project.
- `npm run build` is the production build check.
- `npm run preview` verifies the built app locally.
- `npm run format` applies repository formatting rules.
- `npm run test` runs Vitest in watch mode.
- `npm run test:run` runs the Vitest integration suite once.

## Project Structure and Naming

- App code lives in @src/ with routes in @src/pages/, shared logic in @src/lib/, middleware in @src/middleware.ts, and UI components in @src/components/.
- Supabase and DB assets live in @supabase/.
- Use the alias configured in @tsconfig.json: @/_ resolves to src/_.

## Coding Style and Quality Gates

- ESLint rules in @eslint.config.js are strict and type-aware; treat lint errors as blocking.
- TypeScript strict config from @tsconfig.json and Astro config from @astro.config.mjs are the baseline.
- Husky and lint-staged rules from @package.json run on staged files; keep commits clean before pushing.

## Testing and Verification

- Vitest is the project test runner: use `npm run test` for interactive development and `npm run test:run` for a single pass in CI/local verification.
- CI in @.github/workflows/ci.yml runs npm ci, astro sync, lint, Vitest, and build on pushes and PRs to master.

## Commit and PR Guidelines

- Current history in git log is minimal; use short, imperative commit messages consistent with existing style.
- Open PRs to the origin remote at https://github.com/s2b3k/10xdevs-cook-it.git and ensure CI passes before merge.

## Security and Configuration

- Secrets are required via SUPABASE_URL and SUPABASE_KEY; integration and Playwright tests also require SUPABASE_SERVICE_ROLE_KEY for fixture cleanup. Use .env and .dev.vars locally, never commit real secret values.
- Keep Cloudflare and environment behavior aligned with @astro.config.mjs and @wrangler.jsonc.
