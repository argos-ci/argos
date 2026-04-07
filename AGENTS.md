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
