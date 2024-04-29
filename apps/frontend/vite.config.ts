import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    mode: process.env.BUILD_MODE || mode,
    plugins: [
      react(),
      sentryVitePlugin({
        org: "argos",
        project: "argos-browser",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            return undefined;
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
            https: {
              key: readFileSync(
                join(
                  import.meta.dirname,
                  "../../_wildcard.argos-ci.dev-key.pem",
                ),
              ),
              cert: readFileSync(
                join(import.meta.dirname, "../../_wildcard.argos-ci.dev.pem"),
              ),
            },
            proxy: {
              "/graphql": {
                target: "https://app.argos-ci.dev:4001",
                secure: false,
              },
              "/config.js": {
                target: "https://app.argos-ci.dev:4001",
                secure: false,
              },
            },
          }
        : undefined,
  };
});
