---
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
---

## Why this stack

For a medium-scale web app with a short, after-hours timeline, the fastest and safest path is the vetted JS default for this project type. 10x-astro-starter gives an opinionated TypeScript-first structure, a clear route to authentication and data features, and deployment defaults aligned with rapid first release. The standard path was chosen deliberately to reduce decision overhead and keep setup momentum high, while still allowing deployment and CI choices to be explicit. Cloudflare Pages plus GitHub Actions with auto-deploy-on-merge matches the starter’s intended operating model and keeps day-one scaffolding straightforward under first-class automation support.
