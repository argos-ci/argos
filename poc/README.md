# Flows POC

Proof of concept for the "Flows" product direction: browsing an app's user
journeys (checkout, signup…) as sequences of screenshots captured in CI.

## What it demonstrates

- **Flows derive automatically from the test structure** — a flow is any test
  with at least one screenshot, grouped by `metadata.test.titlePath`
  (Storybook uploads group by story component). No metadata to add, no
  configuration: every existing project benefits.
- **Gallery** (`pages/Project/Flows/`): one card per flow with a cover image;
  multi-step journeys sort first.
- **Flow view** (`flows/:flowId`): the journey rendered large, step by step.
  Default order is alphabetical; **drag & drop** sets the real order,
  persisted per project (localStorage for the POC — production would store it
  server-side next to ignore config and automations).
- Falls back to the latest build when a project has no reference build, and
  the empty states diagnose what's missing (no build vs no test/story
  metadata).

## Run it

```bash
docker compose up -d
pnpm --filter @argos/backend build && pnpm --filter @argos/frontend build

# ⚠ recreates the TEST database (the one used by e2e)
pnpm --filter @argos/backend exec cross-env NODE_ENV=test pnpm db:reset

cd apps/backend && node ../../poc/generate-images.mjs && cd ../..
NODE_ENV=test node poc/seed.mjs > poc/seed-output.json
NODE_ENV=test TZ=utc pnpm exec playwright test --config=poc/playwright.config.cjs
```

Screenshots land in `poc/shots/` (gallery + flow view, light/dark). The spec
also asserts drag & drop reordering and its persistence across reloads. The
web server binds port 3939 to leave 3000 to the regular dev server.

Note: the demo images are served by Playwright request interception (the
`flowpoc-*` keys don't exist on the real CDN), so browsing the seeded project
manually shows broken screenshot images — use the driver's screenshots.
