# Reproducing one Playwright spec locally

CI runs the whole Playwright suite; locally, run only the specs that failed
there. Port 3000 and the `test` database are shared with every other checkout
on the machine, and the `setup` project truncates that database, so give the
run its own database and port.

## Setup

```bash
lsof -nP -iTCP:3187 -sTCP:LISTEN   # pick another port if taken
docker compose up -d               # postgres, redis, rabbitmq
pnpm build                         # specs run against apps/frontend/dist
export PG_DATABASE=deps_e2e NODE_ENV=test PORT=3187 SERVER_URL=http://localhost:3187
pnpm run --filter @argos/backend db:create
pnpm run --filter @argos/backend db:load
pnpm exec playwright install chromium firefox   # after a @playwright/test bump
```

Write this config to a scratch directory, outside the repository, replacing
`<repo>` with the absolute checkout path. It may import nothing but the base
config, because `@playwright/test` does not resolve from outside the repo.

```ts
import base from "<repo>/playwright.config.mts";

const PORT = Number(process.env.PORT);
const SERVER_URL = `http://localhost:${PORT}`;

export default {
  ...base,
  testDir: "<repo>/tests",
  outputDir: "<scratch>/pw-out",
  reporter: [["list"]],
  use: { ...base.use, baseURL: SERVER_URL },
  webServer: {
    ...base.webServer,
    port: PORT,
    timeout: 60_000, // the base config's 10s is too short on a busy machine
    env: {
      ...base.webServer.env,
      PORT: String(PORT),
      SERVER_URL,
      PG_DATABASE: process.env.PG_DATABASE,
    },
  },
};
```

## Run

With the variables above still exported:

```bash
npx playwright test --config <scratch>/pw.isolated.config.mts \
  --project=chromium --project=firefox -g "<test title>" \
  --repeat-each=5 --workers=1
```

Five repeats separate a deterministic break from a flake: CI's three
attempts failing identically already suggests the former. A failure
screenshot and `error-context.md` (an aria snapshot of the page) land in
`outputDir`.

Rebuild the frontend (`pnpm turbo run build --filter=@argos/frontend`) after
any frontend change; each run starts a fresh server, so it picks the new
bundle up.

## Seeing what the page did

When the error is about timing ("element is not stable", "detached from the
DOM", a key press that did nothing), Playwright's call log does not say what
moved. Put a throwaway spec in `tests/` that repeats the failing steps and,
after each one, logs `document.activeElement` and the `data-*` attributes of
every `[data-side]` element (Base UI popups) at a fixed interval. In the Base
UI 1.9 upgrade that showed focus still inside a closing popup
(`data-ending-style`) when the next hotkey arrived. A temporary
`console.log` in the component, forwarded with `page.on("console")`, gives
the app's side. Delete the spec and the logging before committing.

## Clean up

```bash
psql -h 127.0.0.1 -U postgres -d postgres -c 'DROP DATABASE "deps_e2e" WITH (FORCE)'
```
