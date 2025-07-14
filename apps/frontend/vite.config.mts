import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode: argMode }) => {
  const mode = process.env.BUILD_MODE || argMode;
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
          experimentalMinChunkSize: 10_240,
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (
                id.includes("/react@") ||
                id.includes("/react-dom@") ||
                id.includes("/scheduler@") ||
                id.includes("/react-transition-group@")
              ) {
                return "react";
              }
              if (id.includes("/@sentry+")) {
                return "sentry";
              }
              if (
                id.includes("/react-router-dom") ||
                id.includes("/react-helmet") ||
                id.includes("/graphql@") ||
                id.includes("/react-hook-form")
              ) {
                return "core";
              }
              if (id.includes("/lucide-react") || id.includes("/@primer")) {
                return "icons";
              }
              if (id.includes("/d3-")) {
                return "d3";
              }
              if (id.includes("/lodash")) {
                return "lodash";
              }
              if (id.includes("/recharts")) {
                return "recharts";
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
              "^(?!/auth/github/callback)(?!/auth/google/callback)(?!/auth/gitlab/callback)/auth/.*":
                {
                  target: "https://app.argos-ci.dev:4001",
                  secure: false,
                },
            },
          }
        : undefined,
  };
});
