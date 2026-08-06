# Flows POC

Proof of concept for the "Flows" product direction: reviewing an app's user
journeys (checkout, signup…) as ordered sequences of screenshots captured in
CI, instead of isolated diffs.

## What it demonstrates

- `metadata.flow { name, step, index }` on screenshots (schema + GraphQL —
  no DB migration, it rides the JSONB metadata like `story` and `test` do).
- **Build review filmstrip** (`BuildFlowStrip`): when the active diff belongs
  to a flow, the whole journey renders as an ordered strip under the header —
  status dots on changed steps, click to jump between steps.
- **Flows tab** (`pages/Project/Flows.tsx`): one storyboard per flow, rendered
  from the latest reference build — the first Argos screen that shows the
  product itself rather than diffs.

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

Screenshots land in `poc/shots/` (Flows tab + review filmstrip, light/dark).
The spec also asserts that clicking a filmstrip step navigates to that diff.

Note: the demo images are served by Playwright request interception (the
`flowpoc-*` keys don't exist on the real CDN), so browsing the seeded project
manually shows broken screenshot images — use the driver's screenshots.
