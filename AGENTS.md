# Argos

Monorepo: `apps/backend` (Express + GraphQL + Objection/Knex), `apps/frontend`
(React + Vite + Apollo), shared code in `packages/`. Local setup (Docker, DB
seeding, dev server) is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## Before finishing any change

**Run `pnpm run static-checks`.** It is the same turbo task CI runs
(`check-types`, `check-format`, `lint`, `knip`), so it is the only thing that
tells you CI will pass. Fix everything it reports, including unused code found
by knip.

While iterating, use the fast local checks on what you touched:
`oxfmt <target>`, `tsrs --noEmit`, `oxlint <target>`.

Type checking is [tsrs](https://github.com/oxc-project/tsrs), a Rust port of
the TypeScript compiler. `typescript` is pinned to the exact TypeScript build
tsrs ports (`tsrs --version` prints it), so the editor and every tool that peers
on `typescript` see the compiler CI checks with: bump the two together.

Formatting is [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html), configured
once in `.oxfmtrc.json` at the repository root — there is no per-workspace config
and no per-workspace `check-format` script. It formats the whole monorepo in a
couple of seconds, so `pnpm run check-format` at the root is the only command you
need. Keep it that way: per-workspace scripts leave root-level sources like
`tests/` and `vitest/` unchecked, because no workspace owns them. It also owns
import sorting and Tailwind class sorting, which used to be Prettier plugins.

Linting is [oxlint](https://oxc.rs/docs/guide/usage/linter.html), configured once
in `.oxlintrc.json` at the repository root — there is no per-workspace config and
no per-workspace `lint` script. It lints the whole monorepo in well under a
second, so `pnpm run lint` at the root is the only command you need. The rule set
is oxlint's `correctness` category across the `typescript`, `unicorn`, `oxc`,
`react` and `vitest` plugins, plus the deviations listed in `rules` /
`overrides`. Three project-specific guards live there:

- `no-restricted-imports` keeps `sonner` out of the frontend (import from
  `@/ui/Toaster` instead).
- `argos/no-module-relative-paths` — a local plugin in
  `tools/oxlint-plugin-argos.js`, wired up through `jsPlugins` — rejects
  `import.meta.dirname` / `__dirname` in the bundled backend. Oxlint has no
  `no-restricted-syntax` equivalent, so the rule is hand-written.
- `argos/no-dashes-in-copy`, in the same plugin, enforces the dash ban from
  [Copy](#copy): it rejects em and en dashes in every string and JSX text in
  `apps/frontend/src` and `apps/backend/src`, tests and generated code aside.
  Write a range with a hyphen or "to": "2-5 min", "Nov 1 to Dec 1".

Suppress with `// oxlint-disable-next-line <rule>`. Oxlint still honours
`eslint-disable` comments, but do not write new ones.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), with one
rule that decides the type: **`feat` and `fix` are for what a user would
notice** — a capability they gain, a bug they hit. Judge it from their side of
the screen, not from how much code moved or how hard it was to find. Everything
else is `chore`, however substantial: refactors, tests, tooling, docs,
dependency bumps, and internal fixes no user could ever observe. Do not use
`style` — the formatter owns formatting, so the type has nothing left to
describe.

## Comments

**A comment has to say something the code cannot.** A constraint coming from
elsewhere in the system, a race, a workaround, a decision whose better-looking
alternative is wrong — those earn their lines, and the codebase is full of
them on purpose. Everything else is noise a reader wades through and a
maintainer has to keep true.

So do not write:

- a restatement of the line below it — `// Review the next build` over a
  button that reads "Review next build";
- a defence of what is _not_ in the code. An approach considered and dropped
  belongs in the pull request, where it is read once, not in the file, where
  it is read forever;
- an explanation of a name that is already clear, or a banner announcing a
  section the structure already shows.

Comment the part that is actually surprising, not the whole block around it.
When the explanation keeps growing, the code usually wants a named function
instead.

## Copy

Copy is every word a user reads: UI text, toasts, emails, error messages, API
and MCP descriptions, CLI output. Write it the way Vercel or Linear do. Keep it
short, plain and confident, and respect the reader's time.

- **No em dashes (—) or en dashes (–).** Use a period, a colon, a comma or
  parentheses instead. Two short sentences beat one long one.
- **Lead with what matters.** Say what happened or what the user can do, then
  stop. "Token revoked", not "The token has been successfully revoked."
- **Active voice, second person.** "Argos rejects the next upload" and "your
  CI", not "uploads will be rejected" and "the user's CI".
- **Be specific.** Name the thing and the consequence: "CI using **Monorepo
  CI** is rejected from its next upload", not "this may break things".
- **No filler, hype or alarm.** No "simply", "just", "easily", "seamless",
  "powerful", "please" or exclamation marks. State a risk once, plainly,
  without a list of ways it could happen.
- **Errors say what went wrong, then what to do**, in two sentences: "This
  project token has expired. Create a new one."
- **Toasts are a noun and a past participle**, without a period: "Token
  renamed".
- **One name per concept.** Use the words the rest of the product and the docs
  use: project token, build, screenshot, team.

Older copy predates these rules, so don't take it as a model. Fix the strings
you touch.

## Learning from review

Every human correction — a requested change on a pull request, a comment pinned
to an Argos screenshot, a "no, do it this way" in the session — means these
instructions were missing something. Fix the instance, then fix the cause, so
the next agent does not make the same mistake.

- **Write down the rule that would have prevented it**, not the instance: the
  convention behind "rename this", not the rename. Keep it as narrow as the
  review; a rule broader than what the reviewer objected to forbids things
  nobody asked to forbid. When the intent is unclear, ask in the thread first.
- **Put it where it gets enforced, strongest first.** A lint rule
  (`.oxlintrc.json`, or `tools/oxlint-plugin-argos.js` for a custom one), a type
  or a test fails CI on the next attempt; a sentence can be skimmed past.
  Otherwise add it to the matching section of this file, or to the skill in
  `.agents/skills/` when only that workflow needs it.
- **Edit, don't append.** Fold the lesson into the section it belongs to, and
  replace a rule the review contradicts instead of keeping both. Record the rule
  and why it holds, not the story: the pull request and who asked are in git
  history.
- **Ship it in the same pull request as the fix**, so the reviewer checks the
  rule as well as the code.

Skip what will not recur: a typo, a one-off judgment call, a question answered
without a change.

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
4. Reset the test DB before running the Playwright tests:
   `NODE_ENV=test pnpm run --filter @argos/backend db:reset`.
   `pnpm test:integration` needs nothing — it rebuilds its own databases
   whenever `structure.sql` changes.

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
- Team and project permissions (`Account`/`Team`/`Project` `getPermissions`,
  `getProjectVisibility`) take the request's auth (`AuthViewer`: `ctx.auth`, or
  the REST token payload), never a bare `User`: what a member may reach depends
  on how the request authenticated — a team enforcing SAML keeps out members
  whose session or token did not come through its IdP. Resolve team membership
  through `Team.getAccess`, not a raw `team_users` lookup.

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

**Reusable pieces belong in `@/ui` with a story.** Before styling a piece of UI
by hand (an inline warning, a badge…), look for the component in `@/ui` — e.g.
`Callout` for a warning inside a form. When markup is about to be copied, extract
it there with a `*.stories.tsx`, so Argos screenshots it. To line an icon up with
the first line of text, wrap it in `flex h-lh items-center` rather than picking
an `mt-*`: the box is one line-height tall at any text size.

If possible, put some screenshots or videos using `/argos-upload` skill.

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

## What to test

Coverage is not the goal. Every test is code someone has to keep working, so it
has to earn its place by protecting something the project actually depends on.

- **Test what matters to the whole project, not edge cases.** Billing,
  permissions and auth, the build lifecycle, review and comment flows,
  notifications — the paths where a regression reaches users or corrupts data.
  A test that pins one component's internal state buys little and costs
  maintenance forever.
- **The more end-to-end, the better.** A Playwright spec exercises the real
  server, the real database and the real client together, which is where bugs
  actually live; the same assertion one layer down proves much less. When a
  behavior can be reached from the UI, test it there and skip the unit test.
- **Avoid mocking.** A mock asserts what you assumed the collaborator does, so
  the test passes while production breaks. If a behavior can only be reached by
  mocking, move the test further out — or accept that it does not need one.
- **Low-level utilities are the exception worth being exhaustive about.** Pure
  helpers with many input shapes — parsers, validators, comparators, formatters
  — are cheap to cover case by case, and that is exactly where a table-driven
  `*.test.ts` pays off.
- **Not every fix needs a test.** A flake, a one-off rendering detail or an
  ordering tweak is usually fixed and left at that. Add a guard only when the
  behavior is worth defending on its own.

## Testing (Vitest)

- Tests live next to the code. `*.e2e.test.ts` requires Redis/Postgres,
  `*.test.ts` otherwise.
- `pnpm test:unit` (no infra) / `pnpm test:integration` (Postgres + Redis).
- Use `apps/backend/src/database/testing/factory.ts` for fixtures, and
  `test.extend` (prefer one per file, creating models inside fixtures).
- Keep fixtures small, reusable, independent, and split by concern so tests run
  in parallel. Avoid large shared setups.
- Test API endpoints with `createTestHandlerApp` + `supertest`.
- `test:integration` runs in parallel, and every test truncates the whole
  database, so each worker owns a `test_<workerId>` database, a Redis database
  and a queue prefix — set up by `vitest/vitest.e2e.global-setup.mts` (see
  `apps/backend/src/database/testing/workers.ts`). Nothing to create by hand:
  worker databases are built from `db/structure.sql` and rebuilt whenever it
  changes. The `test` database is left alone, it belongs to Playwright.
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
- A guard test — when the behavior warrants one, see [What to test](#what-to-test)
  — should fail without the fix. Verify by temporarily reverting the fix,
  rebuilding, and re-running before trusting it.

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
