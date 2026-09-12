# cook.it

cook.it is a server-rendered recipe library for saving, finding, editing, and deleting your own recipes. Recipes support user-defined taxonomy tags and can be searched by tags, ingredients, or both.

## Tech Stack

- [Astro](https://astro.build/) 6 with SSR
- [React](https://react.dev/) 19 islands for interactive forms and search
- [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Supabase](https://supabase.com/) for authentication and PostgreSQL
- [Cloudflare Workers](https://workers.cloudflare.com/) for deployment

## Prerequisites

- Node.js 22.14.0 (see `.nvmrc`)
- npm
- Docker Desktop for a local Supabase instance

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment files:

```bash
cp .env.example .env
cp .env.example .dev.vars
```

Start Supabase. The first run downloads the local Docker images:

```bash
npx supabase start
```

Copy the `API URL` and `anon key` printed by the CLI into both `.env` and `.dev.vars`:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon-key-from-supabase-start>
```

Apply the database migrations:

```bash
npx supabase db reset
```

Run the app at [http://localhost:4321](http://localhost:4321):

```bash
npm run dev
```

Local Supabase Studio is available at [http://localhost:54323](http://localhost:54323).

## Application Routes

| Route                 | Purpose                               |
| --------------------- | ------------------------------------- |
| `/`                   | Landing page                          |
| `/auth/signup`        | Create an account                     |
| `/auth/signin`        | Sign in                               |
| `/auth/confirm-email` | Email confirmation guidance           |
| `/recipes`            | Search and browse owned recipes       |
| `/recipes/new`        | Add a recipe with taxonomy tags       |
| `/recipes/:id`        | View, edit, or delete an owned recipe |
| `/recipes/:id/edit`   | Edit recipe content and replace tags  |

All recipe data is scoped to the authenticated user through the service layer and Supabase row-level security policies.

## Supabase

The schema is defined in `supabase/migrations/` and includes recipes, taxonomy values, recipe-taxonomy relations, indexes, RLS policies, and the transactional recipe update function.

For a hosted project, set `SUPABASE_URL` and `SUPABASE_KEY` in `.env` and `.dev.vars`, then link and push migrations:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

For local development, email confirmation can be disabled in Supabase Studio under **Authentication > Providers > Email**.

Stop the local stack when finished:

```bash
npx supabase stop
```

## Available Scripts

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Astro development server   |
| `npm run build`     | Build the Cloudflare SSR application |
| `npm run preview`   | Preview the production build         |
| `npm run typecheck` | Run TypeScript checks                |
| `npm run lint`      | Run ESLint                           |
| `npm run lint:fix`  | Fix lint issues where possible       |
| `npm run test:run`  | Run Vitest tests once                |
| `npm run test`      | Run Vitest in watch mode             |
| `npm run format`    | Format the repository with Prettier  |

Playwright browser tests use `http://localhost:4321`, start the dev server automatically, and use the configured `auth.json` storage state:

```bash
npx playwright test
```

## Project Structure

```text
src/
	components/       Astro and React UI components
	layouts/          Shared Astro layouts
	lib/              Supabase client, schemas, services, and utilities
	pages/            SSR pages and API routes
	middleware.ts     Authentication and protected-route handling
supabase/
	migrations/       Database schema, RLS policies, and functions
tests/              Playwright browser tests
context/            Product, roadmap, and change-management documents
```

## Deployment

The app targets [Cloudflare Workers](https://workers.cloudflare.com/). Configure `SUPABASE_URL` and `SUPABASE_KEY` as Cloudflare secrets, then build and deploy:

```bash
npm run build
npx wrangler deploy
```

## CI

GitHub Actions runs dependency installation, Astro sync, lint, and build for pushes and pull requests to `master`. CI requires `SUPABASE_URL` and `SUPABASE_KEY` repository secrets.
