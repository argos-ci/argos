import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Sentry from "@sentry/node";
import express from "express";
import morgan from "morgan";

import config from "@/config/index.js";

import { installApiRouter } from "./api/index.js";
import { installAppRouter } from "./app-router.js";
import { jsonErrorHandler } from "./middlewares/errorHandler.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const redirectToHttps: express.RequestHandler = (req, res, next) => {
  const proto =
    req.headers["x-forwarded-proto"] ||
    req.headers["x-forwarded-protocol"] ||
    req.protocol;

  if (proto !== "https") {
    const host = req.headers.host || req.hostname;
    const secureUrl = `https://${host}${req.originalUrl}`;
    return res.redirect(302, secureUrl);
  }

  next();
};

export const createApp = async (): Promise<express.Express> => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.set("views", join(__dirname, ".."));

  app.use((req, _res, next) => {
    const scope = Sentry.getCurrentScope();
    if (req.headers["x-argos-release-version"]) {
      scope.setTag(
        "clientReleaseVersion",
        req.headers["x-argos-release-version"] as string,
      );
    } else if (req.headers["x-argos-cli-version"]) {
      scope.setTag(
        "clientCliVersion",
        req.headers["x-argos-cli-version"] as string,
      );
    }

    next();
  });

  if (config.get("server.logFormat")) {
    app.use(morgan(config.get("server.logFormat")));
  }

  // Redirect from http to https
  if (config.get("server.secure") && config.get("server.httpsRedirect")) {
    app.use(redirectToHttps);
  }

  await installAppRouter(app);
  installApiRouter(app);

  Sentry.setupExpressErrorHandler(app);
  app.use(jsonErrorHandler());

  return app;
};
