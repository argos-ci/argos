import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { graphqlDocuments } from "@argos/vite-plugin-graphql-documents";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Empties `@pierre/theming`'s Shiki theme collection.
 *
 * `@pierre/diffs` resolves a theme by first checking the themes registered on
 * its resolver, then falling back to `shikiThemes` — a collection of 66 themes,
 * one dynamic import each, so 66 chunks and 1.6 MB of build output. The app pins
 * `pierre-light` / `pierre-dark` (see `DiffEditor`'s `BASE_OPTIONS`), and
 * `@pierre/diffs` registers the whole Pierre collection up front, so the
 * fallback is never taken.
 *
 * The rewrite keeps every export and its shape; `shikiThemes` just resolves
 * nothing, which surfaces as the library's own "No valid theme loader
 * registered" error if a Shiki theme is ever requested. The exact-match
 * assertion below turns a `@pierre/theming` upgrade that reshapes this module
 * into a build failure rather than a silent no-op.
 */
function emptyShikiThemeCollection(): Plugin {
  const MODULE_SUFFIX = "@pierre/theming/dist/themes.js";
  const SHIKI_IMPORT = 'import { shikiThemes } from "./collections/shiki.js";';
  const COMBINED_COLLECTION =
    "const themes = createThemeCollection({ themes: [pierreThemes, shikiThemes] });";
  let applied = false;
  return {
    name: "argos:empty-shiki-theme-collection",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(MODULE_SUFFIX)) {
        return null;
      }
      if (!code.includes(SHIKI_IMPORT) || !code.includes(COMBINED_COLLECTION)) {
        throw new Error(
          `argos:empty-shiki-theme-collection: ${MODULE_SUFFIX} no longer matches the expected shape. Re-check whether @pierre/diffs still falls back to \`shikiThemes\`, then update or drop this plugin.`,
        );
      }
      applied = true;
      return {
        code: code
          .replace(
            SHIKI_IMPORT,
            "const shikiThemes = /* @__PURE__ */ createThemeCollection({ themes: [] });",
          )
          .replace(
            COMBINED_COLLECTION,
            "const themes = /* @__PURE__ */ createThemeCollection({ themes: [pierreThemes] });",
          ),
        // Both rewrites are line-for-line, so only columns shift, inside a
        // 15-line vendor module nobody steps through. An empty mapping set is
        // the documented way to say "unmapped" instead of shipping a wrong one.
        map: { mappings: "" },
      };
    },
    buildEnd() {
      if (!applied) {
        throw new Error(
          `argos:empty-shiki-theme-collection: ${MODULE_SUFFIX} was never transformed. Its resolved path likely changed; update or drop this plugin.`,
        );
      }
    },
  };
}

const VITE_HELPERS = [
  "vite/preload-helper",
  "vite/modulepreload-polyfill",
  "vite/dynamic-import-helper",
  "commonjsHelpers",
  "commonjs-dynamic-modules",
  "__vite-browser-external",
];

/**
 * Vendor groups, matched on the exact package name.
 *
 * Substring matching on the path is what made an earlier version misgroup:
 * `node_modules/react` also matches `react-hook-form`, `react-router` and
 * `react-redux`, so the boot chunk carried a form library and — via recharts —
 * Redux, on pages that render neither.
 *
 * `entriesAware` decides whether a group is one chunk or several. Off, every
 * entry that touches the group downloads all of it; on, Rolldown splits the
 * group by which entries actually import each module. Use it for wide libraries
 * where routes touch disjoint slices, and leave it off for packages the app
 * loads in full at boot anyway — splitting those only adds requests.
 */
const VENDOR_CHUNKS: {
  name: string;
  belongs: (pkg: string) => boolean;
  entriesAware?: boolean;
}[] = [
  { name: "sentry", belongs: (pkg) => pkg.startsWith("@sentry/") },
  {
    name: "d3",
    belongs: (pkg) => pkg.startsWith("d3-"),
  },
  // Recharts pulls in Redux; keeping them together stops it reaching the boot
  // chunk, since charts only appear on the analytics and test pages.
  {
    name: "recharts",
    belongs: (pkg) =>
      pkg === "recharts" ||
      pkg === "react-redux" ||
      pkg === "redux" ||
      pkg === "reselect" ||
      pkg === "immer" ||
      pkg.startsWith("@reduxjs/"),
  },
  // Icon sets are the textbook entriesAware case: thousands of independent
  // single-glyph modules, of which each route renders a handful.
  {
    name: "icons",
    belongs: (pkg) => pkg === "lucide-react" || pkg.startsWith("@primer/"),
    entriesAware: true,
  },
  // React Aria is ~450 kB across dozens of independent widgets, and boot needs
  // only a few of them. As one chunk it was the single largest thing on the
  // critical path; split per entry, calendars and colour pickers stay with the
  // routes that render them.
  //
  // `@internationalized/*` is deliberately absent, so Rolldown decides where it
  // goes — routes that pull it in directly no longer force anything extra along.
  {
    name: "react-aria",
    belongs: (pkg) =>
      pkg === "react-aria" ||
      pkg === "react-aria-components" ||
      pkg === "react-stately" ||
      pkg.startsWith("@react-aria/") ||
      pkg.startsWith("@react-stately/"),
    entriesAware: true,
  },
  {
    name: "react",
    belongs: (pkg) =>
      pkg === "react" || pkg === "react-dom" || pkg === "scheduler",
  },
];

/**
 * Floor for a group-produced chunk. Below this, a separate request costs more
 * than the bytes it saves, so Rolldown folds the modules back into the chunks
 * that import them.
 */
const MIN_CHUNK_SIZE = 20_000;

/**
 * Resolves the installed package a module belongs to. Reads the last
 * `node_modules/` segment so pnpm's nested layout — whose directory names embed
 * peer versions like `react-dom@19.2.8_react@19.2.8` — cannot be mistaken for
 * the package itself.
 */
function getPackageName(id: string): string | null {
  const index = id.lastIndexOf("node_modules/");
  if (index === -1) {
    return null;
  }
  const segments = id.slice(index + "node_modules/".length).split("/");
  const [first, second] = segments;
  if (!first) {
    return null;
  }
  return first.startsWith("@") && second ? `${first}/${second}` : first;
}

// https://vitejs.dev/config/
export default defineConfig((args) => {
  const mode = process.env.BUILD_MODE || args.mode;
  return {
    mode,
    plugins: [
      graphqlDocuments({
        generatedDir: fileURLToPath(new URL("./src/gql", import.meta.url)),
      }),
      react(),
      tailwindcss(),
      emptyShikiThemeCollection(),
      mode !== "development"
        ? sentryVitePlugin({
            org: "argos",
            project: "argos-browser",
            authToken: process.env.SENTRY_AUTH_TOKEN,
          })
        : null,
    ],
    build: {
      sourcemap: mode !== "development",
      rollupOptions: {
        // Both of these are required by `includeDependenciesRecursively: false`
        // below — Rolldown can otherwise emit chunks whose execution order
        // doesn't match the module graph. That failed loudly: the build, test
        // detail, analytics, passkey and settings pages all rendered the root
        // error boundary, while simpler routes were fine.
        preserveEntrySignatures: false,
        output: {
          strictExecutionOrder: true,
          // An `entriesAware` group names each split after every entry that
          // pulls it in, which runs to 100+ characters and spells out the app's
          // route list in `index.html`. The hash already disambiguates, so keep
          // just the group name.
          chunkFileNames: (chunk) =>
            `assets/${chunk.name.split("~")[0]}-[hash].js`,
          // Groups are tried in order and the first match wins, so anything not
          // listed here is left to Rolldown, which places it in the route chunks
          // that actually import it.
          codeSplitting: {
            minSize: MIN_CHUNK_SIZE,
            // Capture only the modules a group's `test` matches, never their
            // dependency closure. Left on (the default), a group also swallows
            // whatever its members import — so the recharts chunk absorbed
            // shared leaf utilities that boot code needs, which made boot
            // statically depend on recharts and put 440 kB of charts on the
            // critical path of every page.
            //
            // Turning it off is what makes the two options above mandatory; see
            // https://rolldown.rs/reference/OutputOptions.codeSplitting
            includeDependenciesRecursively: false,
            groups: [
              {
                // https://github.com/vitejs/vite/issues/5189#issuecomment-2175410148
                name: "common",
                test: (id) =>
                  VITE_HELPERS.some((pattern) => id.includes(pattern)),
                // The runtime helpers are a few hundred bytes and every chunk
                // needs them, so this one is exempt from the size floor.
                minSize: 0,
              },
              ...VENDOR_CHUNKS.map(({ name, belongs, entriesAware }) => ({
                name,
                test: (id: string) => {
                  const pkg = getPackageName(id);
                  return pkg !== null && belongs(pkg);
                },
                entriesAware,
                // Fold an entry's sliver of a split group back into that entry's
                // own chunk when it isn't worth a request of its own.
                entriesAwareMergeThreshold: entriesAware
                  ? MIN_CHUNK_SIZE
                  : undefined,
              })),
            ],
          },
        },
      },
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
        // `@pierre/diffs` reaches for Shiki's *full* bundle — 243 grammars and
        // 66 themes, one emitted chunk each. Swap in a curated bundle covering
        // only the languages the diff viewer can ask for. See `src/shiki/`.
        {
          find: /^shiki$/,
          replacement: fileURLToPath(
            new URL("./src/shiki/bundle.ts", import.meta.url),
          ),
        },
        {
          find: /^shiki\/wasm$/,
          replacement: fileURLToPath(
            new URL("./src/shiki/wasm-stub.ts", import.meta.url),
          ),
        },
      ],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    server:
      mode === "development"
        ? {
            host: "app.argos-ci.dev",
            port: 4002,
            https: getHTTPSConfig(),
            proxy: {
              "/graphql": {
                target: "https://app.argos-ci.dev:4001",
                secure: false,
                // Proxy the subscription WebSocket upgrade too.
                ws: true,
              },
              "/config.js": {
                target: "https://app.argos-ci.dev:4001",
                secure: false,
              },
              "^(?!/auth/github/callback)(?!/auth/google/callback)(?!/auth/gitlab/callback)(?!/auth/saml/callback)(?!/auth/cli)/auth/.*":
                {
                  target: "https://app.argos-ci.dev:4001",
                  secure: false,
                },
              // OAuth Authorization Server endpoints. `/oauth/authorize` is
              // NOT proxied: it is the consent page, an SPA route.
              "^/oauth/(token|register|introspect|revoke)$": {
                target: "https://app.argos-ci.dev:4001",
                secure: false,
              },
              "/.well-known": {
                target: "https://app.argos-ci.dev:4001",
                secure: false,
              },
            },
          }
        : undefined,
  };
});

function getHTTPSConfig() {
  try {
    return {
      key: readFileSync(
        join(import.meta.dirname, "../../_wildcard.argos-ci.dev-key.pem"),
      ),
      cert: readFileSync(
        join(import.meta.dirname, "../../_wildcard.argos-ci.dev.pem"),
      ),
    };
  } catch {
    return undefined;
  }
}
