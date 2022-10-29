/* eslint-env node */
// @ts-ignore
import AssetsPlugin from "assets-webpack-plugin";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import webpack from "webpack";

// eslint-disable-next-line import/no-unresolved
import config from "@argos-ci/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const prod = process.env["NODE_ENV"] === "production";

export default {
  mode: prod ? "production" : "development",
  entry: "./src/index.js",
  output: {
    filename: prod ? "[name]-bundle-[chunkhash:8].js" : "[name].js",
    publicPath: "/static/app/",
  },
  devtool: prod ? "source-map" : "eval-source-map",
  module: {
    rules: [
      {
        test: /\.m?js$/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: "swc-loader",
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    ...(prod
      ? [
          new AssetsPlugin({
            path: "dist",
          }),
        ]
      : []),
    new webpack.EnvironmentPlugin({
      PLATFORM: "browser",
      SENTRY_RELEASE: process.env["COMMIT_REF"] || "",
      API_BASE_URL: "https://api.argos-ci.dev:4001",
    }),
  ],
  ...(!prod
    ? {
        devServer: {
          historyApiFallback: true,
          allowedHosts: "all",
          https: {
            key: readFileSync(
              join(__dirname, "../../_wildcard.argos-ci.dev-key.pem")
            ),
            cert: readFileSync(
              join(__dirname, "../../_wildcard.argos-ci.dev.pem")
            ),
          },
          host: "app.argos-ci.dev",
          port: config.get("client.port"),
          proxy: {
            "**": {
              target: `https://app.argos-ci.dev:${config.get("server.port")}`,
              secure: false,
            },
          },
        },
      }
    : {}),
};
