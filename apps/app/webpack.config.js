/* eslint-env node */
// eslint-disable-next-line no-global-assign
require = require("esm")(module);

const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const AssetsPlugin = require("assets-webpack-plugin");
const { default: config } = require("@argos-ci/config");

const prod = process.env.NODE_ENV === "production";
module.exports = {
  mode: prod ? "production" : "development",
  entry: "./src/index.js",
  output: {
    filename: prod ? "[name]-bundle-[chunkhash:8].js" : "[name].js",
    publicPath: "/static/app/",
  },
  devtool: prod ? "source-map" : "eval-cheap-module-source-map",
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
      SENTRY_RELEASE: process.env.COMMIT_REF || "",
      API_BASE_URL: "https://api.argos-ci.dev:4001",
    }),
  ],
  ...(!prod
    ? {
        devServer: {
          historyApiFallback: true,
          allowedHosts: "all",
          https: {
            key: fs.readFileSync(
              path.join(__dirname, "../../_wildcard.argos-ci.dev-key.pem")
            ),
            cert: fs.readFileSync(
              path.join(__dirname, "../../_wildcard.argos-ci.dev.pem")
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
