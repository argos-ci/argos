/* eslint-disable no-console */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Sentry from "@sentry/node";
import compress from "compression";
import { renderFile } from "ejs";
import express, { static as serveStatic } from "express";
import helmet from "helmet";
import morgan from "morgan";

import config from "@/config/index.js";

import { installApiRouter } from "./api/index.js";
import { installAppRouter } from "./app-router.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const createApp = async () => {
  const app = express();
  app.disable("x-powered-by");
  app.engine("html", renderFile);
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

  app.use(Sentry.Handlers.requestHandler());

  if (config.get("server.logFormat")) {
    app.use(morgan(config.get("server.logFormat")));
  }

  app.use(compress());

  // Redirect from http to https
  if (config.get("server.secure") && config.get("server.httpsRedirect")) {
    app.use((req, res, next) => {
      if (req.headers["x-forwarded-proto"] !== "https") {
        res.redirect(`https://${req.hostname}${req.url}`);
      } else {
        next(); /* Continue to other routes if we're not redirecting */
      }
    });
  }

  // Public directory
  app.use(
    serveStatic(join(__dirname, "../../../../public"), {
      etag: true,
      lastModified: false,
      setHeaders: (res) => {
        res.set("Cache-Control", "no-cache");
      },
    }),
  );

  app.use(
    helmet({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      frameguard: {
        action: "deny", // Disallow embedded iframe
      },
    }),
  );

  installApiRouter(app);
  await installAppRouter(app);

  return app;
};
