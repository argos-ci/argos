# Argos project

## Database

The schema lives in `db/` and is managed with **Knex** + **Objection** models.

### Changing the schema (migration + model)

To add/change a column or table:

1. **Create a new migration** using `pnpm run --filter backend db:migrate:make short-description`, it will add a file in `db/migrations/`. Overwrite the content of this file to use `async / wait` for `up` and `down` functions and write the migration:

   ```js
   export async function up(knex) {
     await knex.schema.alterTable("comments", (table) => {
       table.dateTime("editedAt").nullable();
     });
   }
   export async function down(knex) {
     await knex.schema.alterTable("comments", (table) => {
       table.dropColumn("editedAt");
     });
   }
   ```

   For raw constraint changes (e.g. CHECK constraints) use `knex.raw(...)` and
   add `export const config = { transaction: false }` when needed.

2. **Apply it and regenerate `db/structure.sql`** (the committed schema dump) in
   one step:

   ```bash
   pnpm --filter @argos/backend run db:dump
   ```

   This runs `db:migrate:latest` then dumps `structure.sql`. Commit both the
   migration and the updated `structure.sql`.

3. **Update the Objection model** in `src/database/models/`:
   - Add the column to `jsonSchema.properties` (nullable columns use
     `{ type: ["string", "null"] }`; dates are stored as ISO strings).
   - Add the typed class field (e.g. `editedAt!: string | null;`).
   - `createdAt`/`updatedAt` are handled by the base `Model`.

4. **Reset the test DB** before running e2e tests after a new migration:

   ```bash
   NODE_ENV=test pnpm run --filter @argos/backend db:reset
   ```

### Idempotent inserts

Never gate an insert on a prior existence check (read-then-insert) — two
concurrent requests can both pass the check and then race on the primary key.
Insert atomically with `onConflict([...]).ignore()` (or `.merge(...)` for
upserts). When you need to know whether the row was actually created (e.g. to
send a notification only once), read the `.returning(...)` rows: an empty array
means the conflict was ignored.

```js
const inserted = await knex("comment_reactions")
  .insert({ commentId, userId, emoji })
  .onConflict(["commentId", "userId", "emoji"])
  .ignore()
  .returning("commentId");
if (inserted.length === 0) {
  return; // already existed, nothing to do
}
```

## GraphQL

- Keep the schema as the **source of truth**.
- Regenerate types after every schema change.

### Codegen

- Add the relevant mapper in `/codegen.ts` when needed.
- Prefer explicit mappers to avoid hidden inconsistencies.
- After editing any `typeDefs` (in `src/graphql/definitions/`), regenerate types
  from the repo root:

  ```bash
  pnpm run codegen
  ```

  This writes the backend resolver types
  (`src/graphql/__generated__/resolver-types.ts`, `schema.gql`) and the frontend
  types (`apps/frontend/src/gql/`). Import generated enums/types (e.g.
  `ICommentPermission`) from `../__generated__/resolver-types` and cast service
  return values to them rather than using `any`.

### Exposing a model field

To surface a model column in the API: add it to the relevant `type` in the
`typeDefs`, add a resolver in the matching `definitions/*.ts` (map DB
representation → GraphQL, e.g. ISO string → `DateTime` via `new Date(...)`,
returning `null` when absent), run `pnpm run codegen`, then consume it in the
frontend fragment.

### Permissions

Expose per-object permissions as an enum field
(`permissions: [XxxPermission!]!`) computed from `ctx.auth?.user`. Put the logic
in a small pure helper (see `src/comment/permissions.ts`) so the same function
backs both the `permissions` resolver and the authorization guard inside the
mutation. Always enforce the check in the mutation — never trust the client.

### Resolvers

- Keep resolvers **thin**.
- Move business logic to services.
- Use generated types (avoid `any`).

### Performance

- Use **DataLoader** to avoid N+1 queries.
- Batch and cache database calls when possible.

### Schema design

- Use clear naming:
  - Queries: `getX`, `listX`
  - Mutations: `createX`, `updateX`, `deleteX`
- Keep mutations focused and simple.

### Errors & validation

- Validate inputs at the boundary.
- Return consistent, typed errors.
- Do not expose internal errors.

## Rich-text comment editor (TipTap)

Comment `content` is TipTap JSON. The list of TipTap extensions is **duplicated**
and must stay in sync between:

- `src/comment/schema.ts` (backend) — drives `validateCommentJson` and email
  HTML rendering (`renderCommentHtml`).
- `apps/frontend/src/ui/Editor/` (frontend) — the actual editor.

If a node/mark type the client produces isn't registered in the backend schema,
`validateCommentJson` rejects the comment with `Invalid comment body`. When
adding a node (e.g. mentions), configure it with the **same node spec** on both
sides; only the interactive bits (e.g. a mention `suggestion`) are frontend-only.

Never trust the client for anything derived from `content` (e.g. which users are
mentioned). Re-parse the stored JSON on the server and validate against
permissions — see `src/comment/mentions.ts`.

A `mention` node persists **only the user's account id** — never the name (both
node specs override `addAttributes` to drop the default `label`). The display
label is resolved at render time so it never goes stale: the frontend resolves
it via `Comment.mentionedUsers` (the `UserCard_user` fragment), and the server
resolves it in `renderCommentHtml`, which builds a label-aware Mention whose
`renderHTML` reads a `Map<accountId, label>` from `getCommentMentionLabels` (the
persisted `comment_mentions` rows). Unresolvable mentions render as `@unknown`
on both sides.

## Testing

- Use **Vitest** for all tests.
- Place test files next to the code they cover.
- Name test files:
  - `filename.e2e.test.ts` when Redis or Postgres is required
  - `filename.test.ts` otherwise
- Use `apps/backend/src/database/testing/factory.ts` to create fixtures.
- Prefer **Vitest fixtures** with `test.extend` to keep tests fast and maintainable.
- Create models inside fixtures.
- Design fixtures to be:
  - small and reusable
  - independent when possible
  - split by concern to support parallel execution
  - try to have one `test.extend` per test file, with reusable fixtures in it.
- Avoid large shared setups that slow down the suite or reduce concurrency.
- Load dependencies independently whenever possible so tests can run in parallel without unnecessary bottlenecks.
- Avoid mocking unless the behavior cannot be tested realistically.

### Running tests

From the repo root:

```bash
pnpm test:unit          # unit tests (no infra)
pnpm test:integration   # e2e tests (require Postgres + Redis)
```

Before running e2e tests for the first time — and after pulling new migrations — reset the test database so its schema matches `db/structure.sql`:

```bash
NODE_ENV=test pnpm run --filter @argos/backend db:reset
```

If `db:reset` reports `database "test" is being accessed by other users`, terminate the open sessions first:

```bash
psql -h 127.0.0.1 -U postgres -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
   WHERE datname = 'test' AND pid <> pg_backend_pid();"
```
