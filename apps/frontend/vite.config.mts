import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { graphqlDocuments } from "@argos/vite-plugin-graphql-documents";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
 * Substring matching on the path is what made the previous version misgroup:
 * `node_modules/react` also matches `react-hook-form`, `react-router` and
 * `react-redux`, so the boot chunk carried a form library and — via recharts —
 * Redux, on pages that render neither.
 */
const VENDOR_CHUNKS: Record<string, (pkg: string) => boolean> = {
  sentry: (pkg) => pkg.startsWith("@sentry/"),
  icons: (pkg) => pkg === "lucide-react" || pkg.startsWith("@primer/"),
  d3: (pkg) => pkg.startsWith("d3-"),
  // Recharts pulls in Redux; keeping them together stops it reaching the boot
  // chunk, since charts only appear on the analytics and test pages.
  recharts: (pkg) =>
    pkg === "recharts" ||
    pkg === "react-redux" ||
    pkg === "redux" ||
    pkg === "reselect" ||
    pkg === "immer" ||
    pkg.startsWith("@reduxjs/"),
  // `@internationalized/*` is deliberately absent, so Rolldown decides where it
  // goes. It still ends up here, since react-aria itself needs it at boot, but
  // routes that pull it in directly no longer force anything extra along.
  "react-aria": (pkg) =>
    pkg === "react-aria" ||
    pkg === "react-aria-components" ||
    pkg === "react-stately" ||
    pkg.startsWith("@react-aria/") ||
    pkg.startsWith("@react-stately/"),
  react: (pkg) => pkg === "react" || pkg === "react-dom" || pkg === "scheduler",
};

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
        output: {
          manualChunks: (id) => {
            // https://github.com/vitejs/vite/issues/5189#issuecomment-2175410148
            const helper = VITE_HELPERS.find((pattern) => id.includes(pattern));
            if (helper) {
              return "common";
            }

            const pkg = getPackageName(id);
            if (!pkg) {
              return null;
            }
            for (const [chunkName, belongs] of Object.entries(VENDOR_CHUNKS)) {
              if (belongs(pkg)) {
                return chunkName;
              }
            }
            // Everything else is left to Rolldown, which places it in the route
            // chunks that actually import it.
            return null;
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
