---
name: verify
description: Build, launch, and drive the Argos app locally to verify frontend/backend changes end-to-end against the test database.
---

# Verifying Argos changes end-to-end

## Build

```bash
pnpm --filter @argos/frontend build   # vite → apps/frontend/dist (~40s)
pnpm --filter @argos/backend build    # swc → apps/backend/dist (~10s)
```

The web server (`apps/backend/dist/processes/proc/web.js`) serves the built
frontend — rebuild the frontend after every source change you want to observe.

## Environment

- Docker provides Postgres (5432) and Redis (6380): `docker compose up -d`
  (containers `argos-postgres-1`, `argos-redis-1`).
- Test DB: `cd apps/backend && NODE_ENV=test pnpm db:migrate:latest`.
- Node: repo pins 24 (`.nvmrc`), shell may have 26 via mise —
  run node things with `mise exec node@24 -- <cmd>`.

## Gotcha: stock Playwright e2e does NOT run locally

`pnpm test:e2e` fails on any locally-installed Node (24/22/26, checked
2026-07) at two levels:

1. Loading `playwright.config.mts` → imports `apps/backend/src/config` →
   convict → semver → Node ERR_INTERNAL_ASSERTION "Unexpected module status 3".
2. Even with a CJS config, test files importing backend `src/` TS die in
   Playwright's resolve hook: `context.conditions?.includes is not a function`.

CI works because it runs inside `mcr.microsoft.com/playwright:v1.61.0-jammy`.

## Local workaround that works

1. **Seed via a plain `.mjs` script importing from `apps/backend/dist/`**
   (compiled JS — no transform involved), run with
   `NODE_ENV=test mise exec node@24 -- node seed.mjs`. Reuse
   `createUserAccount` / `createTeamAccount` / `createProject` /
   `createBuildScenario` from `dist/database/seeds.js`, `truncateAll` from
   `dist/database/testing/index.js`, and `createSession` from
   `dist/auth/session.js`. Print JSON (slugs, build number, session
   `rawToken`) for the spec.
2. **Write a self-contained spec** (no backend imports) that logs in by
   setting cookies `argos_session=<rawToken>` (httpOnly) and
   `argos_logged_in=1` on `http://localhost:3000`, reading the seed JSON from
   an env var.
3. **Minimal CJS Playwright config inside the repo root** (module resolution
   fails outside it): baseURL `http://localhost:3000`, webServer command
   `node <repo>/apps/backend/dist/processes/proc/web.js` with env
   `NODE_ENV=test` and
   `CSP_SCRIPT_SRC` = `` `${getCSPScriptHash()},'unsafe-eval'` `` from
   `require("@argos-ci/playwright")`.
4. Run: `NODE_ENV=test TZ=utc mise exec node@24 -- pnpm exec playwright test
<spec> --config=<cjs-config> --project=chromium`.

## Useful facts

- Seeding an active Stripe subscription: `subscriptions` has a
  `check_stripe_fields` constraint — `provider: "stripe"` requires
  `stripeSubscriptionId` (any string) AND `subscriberId` (a `users.id`,
  not an account id).
- Build scenario: build 6 = "changes detected" (2 failures, 6 changed,
  8 added, 2 removed, 2 unchanged), build 7 = accepted, build 8 = rejected.
  All buckets branch `main`, bucket name `default`.
- To trigger "previous approvals" (`branchApprovedDiffs`): earlier build on
  same bucket name+branch with conclusion `changes-detected`, an approved
  non-dismissed `BuildReview` with the viewer's `userId`, matching
  `ScreenshotDiffReview` rows, and matching `fingerprint` on the diffs of
  both builds (seed diffs have no fileIds, so fingerprints are the way).
- IconButtons don't expose accessible names from tooltips; locate them via
  lucide icon classes, e.g. `button:has(.lucide-thumbs-up)`.
