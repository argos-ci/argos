// eslint-disable-next-line import/default
import ejs from "ejs";
import type { RequestHandler } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import config from "@/config/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const indexString = readFileSync(
  join(__dirname, "../../../templates/index.ejs"),
  "utf-8",
);

const getHtmlWebpackPluginConfig = (): {
  files: { css?: string[]; js: string[] };
} => {
  if (
    process.env["NODE_ENV"] === "production" ||
    process.env["NODE_ENV"] === "test"
  ) {
    const rawAssets = readFileSync(
      join(__dirname, "../../../../frontend/dist/webpack-assets.json"),
      "utf-8",
    );
    const assets = JSON.parse(rawAssets);

    return {
      files: {
        css: [assets.main.css],
        js: [assets.main.js],
      },
    };
  }

  return {
    files: {
      js: ["/static/app/main.js"],
      css: ["/static/app/main.css"],
    },
  };
};

const htmlWebpackPlugin = getHtmlWebpackPluginConfig();

const toPrettyJSON = (data: any) => {
  return JSON.stringify(
    data,
    null,
    process.env["NODE_ENV"] === "production" ? 0 : 2,
  );
};

export const rendering = (additionalClientData?: any) => {
  const handler: RequestHandler = (req, res) => {
    const output = ejs.render(indexString, {
      cache: true,
      filename: "review/index.ejs",
      htmlWebpackPlugin,
      config,
      responsive: false,
      clientData: toPrettyJSON({
        config: {
          sentry: {
            environment: config.get("sentry.environment"),
            clientDsn: config.get("sentry.clientDsn"),
          },
          releaseVersion: config.get("releaseVersion"),
          contactEmail: config.get("contactEmail"),
          github: {
            appUrl: config.get("github.appUrl"),
            loginUrl: config.get("github.loginUrl"),
            marketplaceUrl: config.get("github.marketplaceUrl"),
          },
          gitlab: {
            loginUrl: config.get("gitlab.loginUrl"),
          },
          stripe: {
            pricingTableId: config.get("stripe.pricingTableId"),
            publishableKey: config.get("stripe.publishableKey"),
          },
          server: {
            url: config.get("server.url"),
          },
        },
        ...additionalClientData,
      }),
    });

    res.status(200).send(output);
  };
  return handler;
};
