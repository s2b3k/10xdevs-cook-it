---
project: cook-it
researched_at: 2026-05-25T00:00:00Z
recommended_platform: Cloudflare Workers + Pages
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6
  runtime: Cloudflare Workers SSR adapter (@astrojs/cloudflare)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

For this Astro 6 SSR stack, Cloudflare is the strongest fit because the repository is already configured with the Cloudflare adapter and Wrangler, which reduces integration risk and setup time. Given your answers (cost-first, single-region acceptable, external providers acceptable), Cloudflare scores highest on low MVP cost, CLI-first operations, and deterministic deployments while preserving a clean path to global delivery if needed later.

## Platform Comparison

Scoring key: Pass = 2, Partial = 1, Fail = 0. Weighted toward CLI-first, managed/serverless, and stable deploy API. Soft weights applied: cost sensitivity high, global edge low-medium, no familiarity tie-break, co-location low.

| Platform                   | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
| -------------------------- | --------- | ------------------ | ------------------- | ----------------- | ----------------- | ----- |
| Cloudflare Workers + Pages | Pass      | Pass               | Pass                | Pass              | Partial           | 9.0   |
| Netlify                    | Partial   | Pass               | Pass                | Partial           | Partial           | 7.0   |
| Railway                    | Pass      | Partial            | Partial             | Pass              | Partial           | 6.8   |
| Vercel                     | Pass      | Pass               | Partial             | Pass              | Partial           | 6.6   |
| Render                     | Partial   | Partial            | Pass                | Partial           | Partial           | 5.8   |
| Fly.io                     | Pass      | Partial            | Pass                | Partial           | Fail              | 5.6   |

Cloudflare Workers + Pages: Strong CLI loop via Wrangler for deploy, logs, and versions. Native fit for Astro 6 with @astrojs/cloudflare already in this codebase. Pricing is very favorable for low-traffic MVP workloads. MCP/observability integration exists but includes beta surfaces (checked 2026-05-25), so treated as Partial.

Netlify: Good Astro support and strong docs. Deploy ergonomics are strong, but rollback and some operational actions remain more dashboard-centric, lowering CLI-first/stable automation scores. Cost profile can remain good at low usage but credit model and function scaling are less straightforward than Cloudflare for this specific stack.

Railway: Excellent developer speed and straightforward SSR hosting with managed services. Good CLI and deployment lifecycle. Slightly weaker for this MVP because cost floor and container-style always-on model are usually less favorable than serverless edge for low traffic, and docs are solid but not as agent-optimized as top edge-native options.

Vercel: Solid deploy API and great DX, but Astro is not the platform-native framework and WebSocket/server-persistent model limitations can matter once product shape evolves. Cost can stay low at MVP level but can step up with heavier SSR/concurrency patterns.

Render: Flexible and reliable for containerized SSR, with helpful llms docs surfaces. CLI and rollback workflow are less streamlined than top candidates for fully unattended agent operations, and baseline cost profile is usually higher than Cloudflare for this low-traffic MVP target.

Fly.io: Great for persistent processes and regional placement, but this project does not currently require always-on processes. Operational model is closer to managed infra than serverless, which raises maintenance and baseline cost complexity for a fast MVP.

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

Best overall fit to current repository setup and MVP constraints: lowest friction for Astro 6 SSR on this codebase, strong CLI, very competitive low-volume pricing, and minimal infra overhead.

#### 2. Netlify

Strong second option with solid Astro path and mature deployment UX. It trails Cloudflare due to somewhat weaker unattended rollback/CLI posture and less favorable long-run request economics for this specific profile.

#### 3. Railway

Excellent fallback when you want container-like full-stack simplicity and tighter co-located services. It ranks third because your priority is minimizing MVP spend and you do not require persistent processes.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate - Weaknesses

1. Runtime compatibility risk: some Node-oriented dependencies can fail or behave differently on Workers, forcing workarounds.
2. CPU/request limits can surface under heavier SSR handlers and lead to variable performance if not profiled early.
3. Vendor lock-in risk increases when app data and cache layers move deeply into D1/KV/R2 patterns.
4. Code rollback is straightforward, but data/schema rollback is not automatic and needs explicit migration discipline.
5. Local-vs-edge behavior can diverge in subtle ways, so issues may only appear after deployment.

### Pre-Mortem - How This Could Fail

The team selected Cloudflare because it looked like the fastest and cheapest route to ship. Early delivery worked, so they expanded quickly without hardening runtime assumptions. As features grew, more libraries expected Node behavior that was not fully aligned with Workers. Instead of isolating those boundaries, the team added ad hoc patches and compatibility shims. Build and deploy still looked healthy, but runtime incidents became harder to diagnose because failures were situational and traffic-dependent. At the same time, SSR logic became heavier and occasionally hit CPU constraints under real-world usage spikes. Rollbacks restored code quickly but did not reverse schema-level changes, so data inconsistencies persisted across releases. Because the migration/rollback process for data had never been formalized, each incident required manual recovery. Six months later, the platform decision itself was not the real problem; the hidden mismatch between rapid feature growth and untracked runtime/data assumptions had consumed the original cost and speed advantage.

### Unknown Unknowns

- Platform-side optimization settings can affect frontend hydration behavior if not tested against production mode.
- Newly added dependencies may silently rely on unsupported Node APIs and only fail in edge runtime.
- Cost remains low for typical MVP load, but CPU-heavy request patterns can shift economics faster than expected.
- Some observability and AI integration surfaces may be beta/preview and should not be treated as critical-path guarantees.
- Preview/prod secret handling and environment parity can drift unless naming and rotation policy are defined early.

## Operational Story

How the chosen platform operates in day-to-day MVP work.

- **Preview deploys**: branch/PR deploys can produce preview URLs (Pages preview and Workers versions). Protect sensitive previews with Cloudflare Access when needed, and verify behavior with production-like env settings.
- **Secrets**: runtime secrets live in Cloudflare environment variables and Workers secrets (Wrangler plus dashboard). Store CI credentials in GitHub Secrets. Restrict read access to maintainers and rotate on schedule or incident.
- **Rollback**: use Wrangler version rollback for worker code versions. Typical rollback is minutes. Data-level changes (for example D1 migrations) require explicit backward-safe migration strategy.
- **Approval**: human approval required for production publish, primary secret rotation, and destructive data actions. Agent may handle read-only checks, preview deploy validation, and log inspection unattended.
- **Logs**: use Wrangler tail for runtime logs and Cloudflare dashboard analytics for aggregates. Keep agent operations read-only for production observability by default.

## Risk Register

| Risk                                             | Source           | Likelihood | Impact | Mitigation                                                                                                                  |
| ------------------------------------------------ | ---------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Node compatibility gaps in future dependencies   | Devil's advocate | M          | H      | Add dependency admission check for Workers compatibility before merge; keep a small compatibility test route in CI preview. |
| CPU/request constraints on heavier SSR endpoints | Devil's advocate | M          | M      | Profile hot routes early, cache where safe, and enforce response-time budget alerts.                                        |
| Data rollback mismatch after schema changes      | Pre-mortem       | M          | H      | Require forward-and-backward migration plans and dry-run migration checks before production apply.                          |
| Local vs production runtime drift                | Research finding | M          | M      | Validate each release on preview with production-like env vars and smoke tests before publish.                              |
| Over-reliance on beta integration surfaces       | Unknown unknowns | L          | M      | Treat beta/preview features as optional; keep primary workflow on GA Wrangler commands.                                     |
| Cost drift from CPU-heavy request mix            | Unknown unknowns | M          | M      | Track cost and request-class metrics monthly; set budget alerts and tune expensive routes.                                  |

## Getting Started

1. Verify toolchain and install dependencies: Node 22.14.0 (matching this repo), then run npm install.
2. Authenticate Cloudflare CLI once: npx wrangler login.
3. Keep Astro 6 Cloudflare adapter workflow as-is (already configured in this repo); for day-to-day local development use npm run dev.
4. Validate production artifact before first publish: npm run build.
5. Deploy first production version: npx wrangler deploy, then confirm runtime logs with npx wrangler tail.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
