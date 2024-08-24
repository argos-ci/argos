/* eslint-disable no-console */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Sentry from "@sentry/node";
import compress from "compression";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import config from "@/config/index.js";

import { installApiRouter } from "./api/index.js";
import { installAppRouter } from "./app-router.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const createApp = async () => {
  const app = express();

  Sentry.setupExpressErrorHandler(app);

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

  app.use(
    helmet({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "img-src": [
            "'self'",
            "https://argos-ci.com",
            "https://github.com",
            "https://avatars.githubusercontent.com",
            "https://argos.twic.pics",
          ],
          "script-src": [
            "'self'",
            // Script to update color classes
            "'sha256-3eiqAvd5lbIOVQdobPBczwuRAhAf7/oxg3HH2aFmp8Y='",
          ],
        },
      },
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
