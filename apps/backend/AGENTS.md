# Argos project

## GraphQL

- Keep the schema as the **source of truth**.
- Regenerate types after every schema change.

### Codegen

- Add the relevant mapper in `/codegen.ts` when needed.
- Prefer explicit mappers to avoid hidden inconsistencies.

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
