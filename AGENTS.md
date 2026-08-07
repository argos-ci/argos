# Argos

Monorepo: `apps/backend` (Express + GraphQL + Objection/Knex), `apps/frontend`
(React + Vite + Apollo), shared code in `packages/`. Local setup (Docker, DB
seeding, dev server) is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## Before finishing any change

**Run `pnpm run static-checks`.** It is the same turbo task CI runs
(`check-types`, `check-format`, `lint`, `lint:root`, `knip`), so it is the only
thing that tells you CI will pass. Fix everything it reports, including unused
code found by knip.

While iterating, use the fast local checks on what you touched:
`prettier --write <target>`, `tsc --noEmit`, `eslint <target>`.

Do not substitute an ad-hoc `prettier --check` from the repository root: each
workspace runs prettier from its own directory with its own ignore paths, so a
root-level invocation is not equivalent and will miss files that CI rejects.

## TypeScript

- Never use `!` (non-null assertion). Use `invariant` for required values.
- Program by assertion, not by defense: when a value is _expected_ to be present
  (a context provided by an ancestor, a required param, an invariant of the call
  site), assert it with `invariant` (or a hook built on it, e.g.
  `useNonNullable` / `useProjectPermission`) and use it directly. Do not paper
  over the expectation with optional chaining or `?? <fallback>` — that silently
  degrades instead of surfacing a broken assumption. Reserve `?.` / `??` for
  values that are genuinely optional.
- Avoid `as` type assertions; prefer proper typing, type guards, or `satisfies`.
  `as const` is fine.

## Database

Schema lives in `apps/backend/db/`, managed with Knex migrations + Objection
models. To add or change a column:

1. `pnpm run --filter @argos/backend db:migrate:make <short-description>`, then
   write `async` `up` / `down` in the generated file. Use `knex.raw(...)` for
   raw constraint changes, with `export const config = { transaction: false }`
   when needed.
2. `pnpm run --filter @argos/backend db:dump` — migrates and regenerates the
   committed `db/structure.sql`. Commit the migration **and** `structure.sql`.
3. Update the Objection model in `src/database/models/`: add the column to
   `jsonSchema.properties` (nullable → `{ type: ["string", "null"] }`, dates are
   ISO strings) and the typed class field. `createdAt`/`updatedAt` come from the
   base `Model`.
4. Reset the test DB before running e2e tests:
   `NODE_ENV=test pnpm run --filter @argos/backend db:reset`.

**Idempotent inserts:** never gate an insert on a prior existence check — two
concurrent requests can both pass it and race on the primary key. Insert
atomically with `onConflict([...]).ignore()` (or `.merge(...)`), and read the
`.returning(...)` rows when you need to know whether the row was actually
created (empty array = conflict ignored, e.g. don't send the notification).

## GraphQL

- The schema is the source of truth. After editing any `typeDefs` in
  `apps/backend/src/graphql/definitions/`, run `pnpm run codegen` from the repo
  root — it writes the backend resolver types (`src/graphql/__generated__/`,
  `schema.gql`) and the frontend types (`apps/frontend/src/gql/`). Import
  generated enums/types instead of using `any`, and add mappers in `/codegen.ts`
  when needed.
- Keep resolvers thin, put business logic in services, and use **DataLoader** to
  avoid N+1 queries.
- Expose per-object permissions as an enum field (`permissions: [XxxPermission!]!`)
  computed from `ctx.auth?.user`. Put the logic in a pure helper (see
  `src/comment/permissions.ts`) so the same function backs both the `permissions`
  resolver and the guard inside the mutation. **Always enforce the check in the
  mutation — never trust the client.**

## Frontend

**Mutations:** only use `useMutation` when you actually render from its result
tuple (`loading` / `data` / `error`). It re-renders the component while the
request is in flight even if you never read that state. Otherwise call
`useApolloClient().mutate({ mutation, variables, ... })` directly.

**Dialogs:** build them with `Modal` + `Dialog` from `@/ui`. `Modal` owns a
pending state (`ModalActionContext`) that blocks dismissal while an action is in
flight — never track that with a local `loading` boolean.

- Form dialogs: wrap the body in `<Form>` with a `<FormSubmit>`. `Form` flags the
  modal pending during submit and routes server errors through `handleFormError`.
  Close on success with `useOverlayTriggerState().close()`.
- Action dialogs (confirm/delete/revoke): drive the mutation with
  `useModalAction()` to get the same pending-blocks-dismiss behavior. Use
  `role="alertdialog"`, `variant="destructive"` for destructive actions, and
  `toast.success(...)` on completion.

## Notifications

Two-stage async pipeline in `apps/backend/src/notification/`:
`sendNotification({ type, data, recipients })` → `notificationWorkflowJob`
(applies opt-outs) → `notificationMessageJob` (renders and sends the email).

To add a type, model it on an existing handler (e.g.
`handlers/review_submitted.tsx`) and register it in `handlers/index.ts` — the
`NotificationWorkflowType` union and typed `sendNotification` props derive from
that array, and no migration is needed (`data` is a JSON column). `recipients`
is an array of **user ids you compute**; the system never discovers them.

## Rich-text comments (TipTap)

The TipTap extension list is **duplicated** and must stay in sync between
`apps/backend/src/comment/schema.ts` (drives `validateCommentJson` and email
HTML rendering) and `apps/frontend/src/ui/Editor/`. A node the client produces
but the backend doesn't register is rejected with `Invalid comment body`.

Never trust the client for anything derived from `content` (e.g. mentioned
users) — re-parse the stored JSON server-side and check permissions (see
`src/comment/mentions.ts`). A `mention` node persists **only the account id**,
never the label; labels are resolved at render time on both sides.

## Testing (Vitest)

- Tests live next to the code. `*.e2e.test.ts` requires Redis/Postgres,
  `*.test.ts` otherwise.
- `pnpm test:unit` (no infra) / `pnpm test:integration` (Postgres + Redis).
- Use `apps/backend/src/database/testing/factory.ts` for fixtures, and
  `test.extend` (prefer one per file, creating models inside fixtures).
- Keep fixtures small, reusable, independent, and split by concern so tests run
  in parallel. Avoid large shared setups and avoid mocking unless the behavior
  can't be tested realistically.
- Test API endpoints with `createTestHandlerApp` + `supertest`.
- If `db:reset` reports `database "test" is being accessed by other users`:

  ```bash
  psql -h 127.0.0.1 -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'test' AND pid <> pg_backend_pid();"
  ```

## E2E / visual tests (Playwright + Argos)

Specs live in `tests/*.spec.ts` and run against the **built** app.

- **Run with `NODE_ENV=test pnpm test:e2e`.** This is required: the test process
  (which seeds the DB) and the web server must both resolve to the `test`
  Postgres DB. Without it the seeds write to `development` while the server
  reads `test`, and pages render "Page not found".
  - Single test: `NODE_ENV=test pnpm test:e2e --project=chromium -g "<title>"`.
- **Build first** (`pnpm build`), and rebuild the frontend after changing it —
  the server serves `apps/frontend/dist`. Specs import seeds from
  `apps/backend/src` directly, so seed changes need no backend rebuild. Shared
  `packages/*` must be built too or module resolution fails.
- The `setup` project truncates the DB; each test seeds its own data via the
  `loggedTest` fixtures (real session cookie), so keep seeded data isolated.
- Take screenshots with the `screenshot()` helper in `tests/util.ts`. Content
  marked `data-visual-test="transparent"` (e.g. `<Time>`) is neutralized
  automatically; use the helper's `replacements` for other unstable text.
- Seeds live in `apps/backend/src/database/seeds.ts`. Add a focused scenario
  function rather than bending `createBuildScenario`, which many baselines
  depend on. Use a unique `keyPrefix` (e.g. the project id) for `File` keys, and
  reuse existing image keys (`dummy-*`, `diff-*`) so images load from
  `files.argos-ci.com/test/<s3Id>`.
- A guard test should fail without the fix — verify by temporarily reverting the
  fix, rebuilding, and re-running before trusting it.

### Seeding gotchas

- `createBuildScenario`: build 6 = changes detected (2 failures, 6 changed, 8
  added, 2 removed, 2 unchanged), build 7 = accepted, build 8 = rejected. All on
  branch `main`, bucket name `default`.
- An active Stripe subscription needs `provider: "stripe"` **plus**
  `stripeSubscriptionId` and `subscriberId` (a `users.id`, not an account id) —
  the `check_stripe_fields` constraint.
- "Previous approvals" (`branchApprovedDiffs`) needs an earlier build on the same
  bucket name + branch with conclusion `changes-detected`, an approved
  non-dismissed `BuildReview` for the viewer, matching `ScreenshotDiffReview`
  rows, and matching `fingerprint` on both builds' diffs (seed diffs have no
  fileIds, so fingerprints are the only link).
- IconButtons don't expose accessible names from tooltips — locate them via the
  lucide icon class, e.g. `button:has(.lucide-thumbs-up)`.

## Verifying a change in the running app

1. `docker compose up -d` (Postgres on 5432, Redis on 6380).
2. `NODE_ENV=test pnpm run --filter @argos/backend db:migrate:latest`.
3. `pnpm build` (or `pnpm turbo run build --filter=@argos/frontend` for a
   frontend-only change).
4. `NODE_ENV=test pnpm run --filter @argos/backend start-web` — serves the built
   frontend on http://localhost:3000. Always start backend processes through
   `bin/start.sh` (what `start-web` / `start-worker` use); it loads Sentry
   instrumentation before the modules it patches.

For interactive development, `pnpm run dev` runs the watchers instead.
