# Argos Project

## Rules

Before finishing any change:

- Format: `prettier` on modified files

- If **local**:
  - `tsc --noEmit <target>`
  - `eslint <target>`

- If **global**:
  - `pnpm run check-types`
  - `pnpm run knip` (fix unused code)

All checks must pass.

## TypeScript

- Do not use `!` (non-null assertion)
- Use `invariant` for required values
- Program by assertion, not by defense: when a value is _expected_ to be
  present (a context provided by an ancestor, a required param, an invariant of
  the call site), assert it with `invariant` (or a hook built on it, e.g.
  `useNonNullable` / `useProjectPermission`) and then use it directly. Do not
  paper over the expectation with optional chaining or `?? <fallback>` — that
  silently degrades instead of surfacing a broken assumption. Reserve `?.` /
  `??` for values that are genuinely, legitimately optional.
- Avoid `as` type assertions; prefer proper typing, type guards, or
  `satisfies`. `as const` is fine.

## Testing (Vitest)

- Tests live next to the code
- Naming:
  - `*.e2e.test.ts` → requires Redis/Postgres
  - `*.test.ts` → otherwise

- Use `factory.ts` for fixtures
- Use `test.extend` (prefer one per file)

### Principles

- Keep fixtures small, reusable, and independent
- Split by concern for parallelism
- Avoid shared global setup
- Avoid mocking unless necessary

## E2E / visual tests (Playwright + Argos)

- Specs live in `tests/*.spec.ts` and run against the built app.
- **Run with `NODE_ENV=test pnpm test:e2e`.** This is required: the test
  process (which seeds the DB) and the web server must both resolve to the
  `test` Postgres DB. Without `NODE_ENV=test` the seeds write to `development`
  while the server reads `test`, and pages render "Page not found".
  - Single test: `NODE_ENV=test pnpm test:e2e --project=chromium -g "<title>"`.
  - The `setup` project truncates the DB; each test seeds its own data via the
    `loggedTest` fixtures, so keep seeded data isolated (e.g. don't request the
    `builds` fixture if you don't need it).
- **Rebuild the frontend before running** if you changed it — the server serves
  `apps/frontend/dist`: `pnpm turbo run build --filter=@argos/frontend`. The
  backend serves from `dist` too, but specs import seeds from
  `apps/backend/src` directly, so seed changes need no backend rebuild.
- Auth is set via `loggedTest` (real session cookie); take screenshots with the
  `screenshot()` helper in `tests/util.ts` (wraps `argosScreenshot`). Dynamic
  content marked `data-visual-test="transparent"` (e.g. `<Time>`) is neutralized
  automatically; use the helper's `replacements` for other unstable text.
- Seeds live in `apps/backend/src/database/seeds.ts`. Add a focused scenario
  function rather than bending `createBuildScenario` (which many baselines
  depend on). Use a unique `keyPrefix` (e.g. the project id) for `File` keys.
  Image fixtures are served from `files.argos-ci.com/test/<s3Id>`; reuse
  existing keys (`dummy-*`, `diff-*`) so images load.
- A guard test should fail without the fix — verify by temporarily reverting the
  fix, rebuilding, and re-running before trusting it.
