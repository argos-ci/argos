# @argos/vite-plugin-graphql-documents

Makes [GraphQL Codegen](https://the-guild.dev/graphql/codegen)'s
[client preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client)
tree-shakeable under Vite, by inlining each document's AST at its call site.

## The problem

The client preset resolves documents at runtime, through a map keyed by query
string:

```ts
// src/gql/gql.ts (generated)
const documents: Documents = {
  "\n  query Auth_me {\n    me {\n      id\n    }\n  }\n":
    types.Auth_meDocument,
  // …one entry per operation in the app
};

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
```

That map names every operation, so importing it from anywhere retains all of
them. The generated file says so itself:

> This map has several performance disadvantages:
>
> 1. It is not tree-shakeable, so it will include all operations in the project.

In Argos that meant a **~940 kB chunk (52 kB gzip), eagerly loaded on every
page**, holding the AST of all ~180 operations — opening `/login` parsed the
build page's queries.

Codegen ships [Babel](https://www.npmjs.com/package/@graphql-codegen/client-preset)
and [SWC](https://www.npmjs.com/package/@graphql-codegen/client-preset-swc-plugin)
plugins to fix exactly this, but neither applies to a `@vitejs/plugin-react` v6
setup on Vite 8: that combination transforms with Oxc, so there is no Babel or
SWC pipeline to hook into. This plugin does the equivalent rewrite as a Vite
`transform`.

## What it does

```ts
// before
const MeQuery = graphql(`
  query Auth_me {
    me {
      id
    }
  }
`);

// after
const MeQuery = { kind: "Document", definitions: [/* … */] };
```

The AST is read out of the generated `graphql.ts`, so the two can never drift:
`gql.ts` says which constant serves a given source string, and `graphql.ts`
holds that constant's literal.

### Why inline instead of importing the constant?

Importing `Auth_meDocument` from `@/gql/graphql` removes the map but _not_ the
problem. `graphql.ts` is a single module, so as long as chunks import their
documents from it, Rolldown must emit it as one shared chunk containing every
document any chunk needs — the blob just gets renamed. Measured on Argos, that
left 176 of 176 operations on the critical path.

Inlined, each document lands in the one chunk that references it, and the
generated constants become unused exports that tree-shake away — leaving
`graphql.ts` to carry only its enums. That took the critical path from 176
operations to 17.

Each document's source string occurs exactly once in a codebase (that is how
codegen keys the map), so inlining duplicates nothing.

## Usage

```ts
// vite.config.mts
import { graphqlDocuments } from "@argos/vite-plugin-graphql-documents";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    graphqlDocuments({
      // Directory holding the codegen client-preset output.
      generatedDir: fileURLToPath(new URL("./src/gql", import.meta.url)),
    }),
    react(),
  ],
});
```

The plugin runs with `enforce: "pre"`, before the React/Oxc transform, while the
source still matches the strings codegen extracted. It emits a sourcemap for
every module it edits, so stack traces and Sentry uploads stay accurate.

`generatedDir` must contain the preset's two outputs:

| File         | Provides                               |
| ------------ | -------------------------------------- |
| `gql.ts`     | source string → document constant name |
| `graphql.ts` | document constant name → AST literal   |

Both are re-read whenever their mtime changes, so `codegen --watch` edits take
effect without restarting the dev server.

## Safety

The rewrite is deliberately conservative. It only touches
`graphql(` + backtick-template + `)` and skips anything it cannot prove:

- interpolated templates (``graphql(`query ${name} …`)``) — codegen cannot
  have indexed them either
- calls with extra arguments
- lookalike callees (`myGraphql(…)`, `client.graphql(…)`)
- the generated files themselves, which would be circular

A literal that is missing from the index is **left as-is**: the runtime lookup
still resolves it, so the build stays correct — it just retains the map. Because
that only happens when codegen output is stale, the plugin warns:

```
Unknown GraphQL document(s) left as a runtime lookup, which retains the whole
document map. Re-run codegen.
  ProjectBuilds_project
```

## Tests

The parsing and rewriting logic is pure and covered by unit tests:

```sh
pnpm run test:unit packages/vite-plugin-graphql-documents
```
