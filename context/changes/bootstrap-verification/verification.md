---
bootstrapped_at: 2026-05-21T15:21:26.1773436+02:00
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: cook-it
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: cook-it
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

For a medium-scale web app with a short, after-hours timeline, the fastest and safest path is the vetted JS default for this project type. 10x-astro-starter gives an opinionated TypeScript-first structure, a clear route to authentication and data features, and deployment defaults aligned with rapid first release. The standard path was chosen deliberately to reduce decision overhead and keep setup momentum high, while still allowing deployment and CI choices to be explicit. Cloudflare Pages plus GitHub Actions with auto-deploy-on-merge matches the starter’s intended operating model and keeps day-one scaffolding straightforward under first-class automation support.

## Pre-scaffold verification

| Signal      | Value   | Severity | Notes                                                                               |
| ----------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| npm package | not run | n/a      | cmd_template starts with `git clone`, so npm package recency derivation was skipped |
| GitHub repo | not run | n/a      | `gh` command unavailable in this environment                                        |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 31536
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0

#### CRITICAL findings

None.

#### HIGH findings

- `devalue` (range `5.6.3 - 5.8.0`)

#### MODERATE findings

- `@astrojs/check` (direct dependency)
- `wrangler` (direct dependency)
- `@astrojs/language-server`
- `@cloudflare/vite-plugin`
- `miniflare`
- `volar-service-yaml`
- `ws`
- `yaml`
- `yaml-language-server`

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | false                |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:

- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
