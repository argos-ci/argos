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
import { jsonErrorHandler } from "./middlewares/errorHandler.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function getCSPReportURI(): null | string {
  const baseURI = config.get("sentry.cspReportUri");
  if (!baseURI) {
    return null;
  }
  const url = new URL(baseURI);
  url.searchParams.set("sentry_environment", config.get("sentry.environment"));
  url.searchParams.set("sentry_release", config.get("releaseVersion"));
  return url.toString();
}

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

  app.use(compress());

  // Redirect from http to https
  if (config.get("server.secure") && config.get("server.httpsRedirect")) {
    app.use((req, res, next) => {
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
    });
  }

  const cspReportUri = getCSPReportURI();

  if (cspReportUri) {
    app.use((_req, res, next) => {
      res.setHeader(
        "Report-To",
        JSON.stringify({
          group: "csp-endpoint",
          max_age: 10886400,
          endpoints: [{ url: cspReportUri }],
        }),
      );
      next();
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
            "data:",
            "https://argos-ci.com",
            // TwicPics images
            "https://argos.twic.pics",
            // S3 images
            "https://argos-ci-production.s3.eu-west-1.amazonaws.com",
            // GitHub and GitLab avatars
            "https://github.com",
            "https://avatars.githubusercontent.com",
            "https://gitlab.com",
            "https://secure.gravatar.com",
          ],
          "script-src": [
            "'self'",
            // Script to update color classes
            "'sha256-3eiqAvd5lbIOVQdobPBczwuRAhAf7/oxg3HH2aFmp8Y='",
            ...config.get("csp.scriptSrc"),
          ],
          "connect-src": ["'self'", "*"],
          ...(cspReportUri
            ? { "report-to": ["csp-endpoint"], "report-uri": [cspReportUri] }
            : {}),
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

  await installAppRouter(app);
  installApiRouter(app);

  Sentry.setupExpressErrorHandler(app);
  app.use(jsonErrorHandler());

  return app;
};
