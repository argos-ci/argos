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
