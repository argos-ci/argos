import { join } from "node:path";
import express, { Router, static as serveStatic } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

import config from "@/config/index.js";
import { getGoogleAuthUrl } from "@/google/index.js";
import { apolloServer, createApolloMiddleware } from "@/graphql/index.js";
import { slackMiddleware } from "@/slack/index.js";
import { createRedisStore } from "@/util/rate-limit.js";

import { emailPreview } from "../email/express.js";
import { auth } from "./middlewares/auth.js";
import { boom, subdomain } from "./util.js";

export const installAppRouter = async (app: express.Application) => {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 10 seconds)
    standardHeaders: false, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: createRedisStore("app"),
  });

  router.use(limiter);

  router.get("/config.js", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=0");
    res.setHeader("Content-Type", "application/javascript");
    res.send(
      `window.clientData = ${JSON.stringify({
        config: {
          sentry: {
            environment: config.get("sentry.environment"),
            clientDsn: config.get("sentry.clientDsn"),
          },
          releaseVersion: config.get("releaseVersion"),
          contactEmail: config.get("contactEmail"),
          github: {
            appUrl: config.get("github.appUrl"),
            clientId: config.get("github.clientId"),
            loginUrl: config.get("github.loginUrl"),
            marketplaceUrl: config.get("github.marketplaceUrl"),
          },
          githubLight: {
            appUrl: config.get("githubLight.appUrl"),
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
          api: {
            baseUrl: config.get("api.baseUrl"),
          },
        },
      })}`,
    );
  });

  const distDir = join(import.meta.dirname, "../../../frontend/dist");

  if (config.get("env") !== "production") {
    router.use("/email-preview", emailPreview);
  }

  await apolloServer.start();

  router.use(
    "/graphql",
    // Handle cases where the request stream is not readable
    (req, _res, next) => {
      if (!req.readable) {
        console.error(
          "Request stream is not readable. Possible reasons: client closed connection, malformed request, or stream already consumed.",
        );
        throw boom(
          400,
          "Request could not be processed. Please check your connection or the data being sent.",
        );
      }
      next();
    },
    express.json(),
    createApolloMiddleware(),
  );

  router.use(auth);

  router.get("/auth/logout", (req, res) => {
    // @ts-expect-error logout is added dynamically
    req.logout();
    const redirectTo =
      config.get("env") !== "production" ? "/" : "https://www.argos-ci.com";
    res.redirect(redirectTo);
  });

  const OAuthQueryParamsSchema = z.object({
    state: z.string(),
    redirect_uri: z.string(),
  });

  router.get("/auth/google/login", (req, res) => {
    const parsed = OAuthQueryParamsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.redirect("/");
      return;
    }
    const { state, redirect_uri: redirectUri } = parsed.data;
    res.redirect(
      getGoogleAuthUrl({
        clientId: config.get("google.clientId"),
        clientSecret: config.get("google.clientSecret"),
        redirectUri,
        state,
      }),
    );
  });

  router.use(slackMiddleware);

  // Static directory
  router.use(
    serveStatic(distDir, {
      etag: true,
      lastModified: false,
      maxAge: "1 year",
      index: false,
    }),
  );

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

  router.get("*", (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });

  app.use(subdomain(router, "app"));
};

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
