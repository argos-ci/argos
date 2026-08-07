# @argos/build

`argos-build` bundles a package's TypeScript entry points to ESM with
[rolldown](https://rolldown.rs). It replaces `@swc/cli`, which every Node package
in the monorepo used to run as `swc src -d dist --strip-leading-paths`.

```bash
argos-build [--clean] [--watch] [--quiet] [-d dist]
```

Entry points and target come from the package's own `package.json`:

```json
"argos-build": {
  "entries": ["src/instrument.ts", "src/processes/proc/*.ts", "src/*/bin/*.ts"],
  "target": "es2024"
}
```

## Why bundle rather than transpile per file

Because it lets the shared packages drop their build step. `@argos/util` and
`@argos/schemas` now expose `./src/*.ts` directly and are compiled as part of
whatever bundles them — there is no `dist` to keep in sync and no watcher to run
for them in development.

Exposing TypeScript is only possible for bundled consumers. Node refuses to strip
types under `node_modules`:

```
ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
```

and pnpm links workspace packages through `node_modules`. So a package that plain
Node has to load — `@argos/knex-scripts`, with its CLI — gets bundled itself.

## Things to know

- **Dependencies stay external; workspace packages do not.** Only `@argos/*` and
  our own source end up in the output.
- **A bundled workspace package's dependencies become the app's.** `@argos/util`
  needs `@sindresorhus/slugify`, so `apps/backend` has to declare it too — pnpm
  will not resolve it from the app's `node_modules` otherwise. Every build checks
  the emitted files for imports that cannot be resolved and fails with the list,
  rather than letting the process die on its first import at runtime.
- **Never count `../` from a module's own location.** A bundler emits modules at
  whatever depth it likes: `src/config/index.ts` may land as `dist/config/index.js`
  or be inlined into `dist/chunks/config-a1b2c3.js`, and a hard-coded
  `join(__dirname, "../../..")` silently resolves somewhere else. See
  `apps/backend/src/util/paths.ts`, which walks up to a marker file instead.
- **Sentry initializes through `node --import`.** Instrumentation has to run
  before the modules it patches are imported. `import "./setup"` at the top of an
  entry only achieved that while every module was its own file — a bundle is free
  to hoist `express` and `pg` above the `Sentry.init()` call. See
  `apps/backend/src/instrument.ts`.
- **`--target` is per package**, so none silently drifts onto another target.
- **No type checking and no declaration files.** `tsc --noEmit` covers types, and
  packages expose their source as their `types` entry.
- **The CLI is not built.** Node 26 strips types on the fly, which is what keeps
  the tool that builds every package from needing a build of its own.
