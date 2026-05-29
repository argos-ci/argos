import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig((args) => {
  const mode = process.env.BUILD_MODE || args.mode;
  return {
    mode,
    plugins: [
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
            const chunkMap = {
              common: [
                "vite/preload-helper",
                "vite/modulepreload-polyfill",
                "vite/dynamic-import-helper",
                "commonjsHelpers",
                "commonjs-dynamic-modules",
                "__vite-browser-external",
              ],
              sentry: ["node_modules/@sentry"],
              icons: ["node_modules/lucide-react", "node_modules/@primer"],
              moment: ["node_modules/moment"],
              d3: ["node_modules/d3-"],
              lodash: ["node_modules/lodash"],
              recharts: ["node_modules/recharts"],
              "react-aria": [
                "node_modules/react-aria",
                "node_modules/@react-aria",
                "node_modules/@react-stately",
              ],
              react: ["node_modules/react", "node_modules/react-dom"],
            };

            // https://github.com/vitejs/vite/issues/5189#issuecomment-2175410148
            for (const [chunkName, patterns] of Object.entries(chunkMap)) {
              if (patterns.some((pattern) => id.includes(pattern))) {
                return chunkName;
              }
            }
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
