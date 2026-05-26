---
project: cook-it
created_at: 2026-05-25T00:00:00Z
status: ready-for-execution
target_platform: Cloudflare Workers
source_decisions:
  - context/foundation/tech-stack.md
  - context/foundation/infrastructure.md
scope: first-production-deployment
---

## Goal

Execute the first production deployment for the Astro 6 SSR app on Cloudflare Workers with explicit human approval gates, auditable release metadata, and rollback readiness.

## Constraints

- Stack: Astro 6 + @astrojs/cloudflare adapter + Wrangler 4.
- Runtime secrets required: SUPABASE_URL, SUPABASE_KEY.
- This run covers runtime deployment only.
- Out of scope: CI/CD automation rollout, DB migration automation, multi-region HA.

## Phase 1: Preflight

1. Verify repository health:
   - npm ci
   - npx astro sync
   - npm run lint
   - npm run build
2. Verify Cloudflare deployment config:
   - Confirm adapter in astro.config.mjs is cloudflare().
   - Confirm wrangler.jsonc main entrypoint and compatibility_date are present.
3. Confirm ownership and access:
   - Operator with Cloudflare deploy rights.
   - Reviewer for production approval.

## Phase 2: Environment and Secrets

1. Ensure production secrets exist in Cloudflare Worker environment:
   - SUPABASE_URL
   - SUPABASE_KEY
2. Keep secret rotation human-only (no unattended agent rotation).
3. Ensure GitHub repo secrets exist for CI build parity:
   - SUPABASE_URL
   - SUPABASE_KEY

## Phase 3: Human Gate and Deploy

1. Mandatory pre-publish approval checklist:
   - Correct Cloudflare account/worker target.
   - Secrets set and non-empty.
   - Build artifacts generated successfully.
   - Rollback command path verified.
2. Deploy to production:
   - npx wrangler deploy
3. Capture release metadata (store in PR or release notes):
   - deploy timestamp
   - operator
   - worker version id
   - production URL/route

## Phase 4: Post-Deploy Verification

1. Smoke test routes:
   - /
   - /auth/signin
   - /auth/signup
   - /dashboard (expects unauthenticated redirect if signed out)
2. Verify auth API behavior:
   - /api/auth/signin
   - /api/auth/signup
   - /api/auth/signout
3. Verify runtime logs:
   - npx wrangler tail
4. Verify rollback readiness (no rollback execution unless incident):
   - npx wrangler versions list
   - npx wrangler rollback <version-id> (document only)

## Phase 5: Immediate Follow-up (After Stable First Release)

1. Add deploy workflow with manual production approval gate in GitHub Actions.
2. Add release checklist item for Cloudflare runtime compatibility of new dependencies.
3. Set monthly cost/performance review checkpoint.

## Acceptance Criteria

- Build passes locally.
- Production deploy completed.
- Smoke tests pass on critical routes.
- No critical runtime errors during first 15 minutes after deploy.
- Rollback path documented with a valid version id source.

## Execution Commands (Operator)

```bash
npm ci
npx astro sync
npm run lint
npm run build
npx wrangler login
npx wrangler deploy
npx wrangler tail
npx wrangler versions list
```

## Risk Controls Applied

- Human approval required before publish.
- Human-only actions for destructive operations (secret rotation, DB-destructive changes, rollback execution during incident).
- Deployment metadata captured for auditability.

## Execution Log

Date: 2026-05-25
Status: first production deployment completed

### Deployment Result

- Command executed: npx wrangler deploy
- Worker URL: https://10x-astro-starter.pawel-sobecki.workers.dev
- Version ID: d358e070-ce61-474a-b600-62d93abdbe35
- Provisioned binding during deploy: SESSION KV namespace

### Smoke Test Results

- GET / -> 200
- GET /auth/signin -> 200
- GET /auth/signup -> 200
- GET /dashboard -> 302 (expected redirect for unauthenticated access)
- GET /api/auth/signin -> 404 (expected: unsupported method)
- GET /api/auth/signup -> 404 (expected: unsupported method)
- GET /api/auth/signout -> 404 (expected: unsupported method)
- POST /api/auth/signin -> 403 (endpoint reachable; request rejected without valid flow/inputs)
- POST /api/auth/signup -> 403 (endpoint reachable; request rejected without valid flow/inputs)
- POST /api/auth/signout -> 403 (endpoint reachable; request rejected without valid flow/inputs)

### Rollback Readiness

- Version list captured via npx wrangler versions list
- Available version IDs:
   - 5a55eb67-83cb-404d-b96b-4a497943fbf9
   - d358e070-ce61-474a-b600-62d93abdbe35
- Rollback command path validated: npx wrangler rollback <version-id>

### Notes

- Preflight passed: npm ci, npx astro sync, npm run lint, npm run build.
- Lint emitted parser warnings from astro-eslint-parser projectService handling (non-blocking).
- Build emitted sitemap warning about missing site option in astro config (non-blocking).
