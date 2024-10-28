import { join } from "node:path";
import express, { Router, static as serveStatic } from "express";
import { rateLimit } from "express-rate-limit";

import config from "@/config/index.js";
import { getGoogleAuthUrl } from "@/google/index.js";
import { apolloServer, createApolloMiddleware } from "@/graphql/index.js";
import { slackMiddleware } from "@/slack/index.js";
import { createRedisStore } from "@/util/rate-limit.js";

import { emailPreview } from "../email/express.js";
import { auth } from "./middlewares/auth.js";
import { subdomain } from "./util.js";

export const installAppRouter = async (app: express.Application) => {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 10 seconds)
    standardHeaders: false, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: createRedisStore("app"),
  });

  app.use(limiter);

  router.get("/config.js", (_req, res) => {
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

  router.use("/graphql", express.json(), createApolloMiddleware());

  router.use(auth);

  router.get("/auth/logout", (req, res) => {
    // @ts-expect-error logout is added dynamically
    req.logout();
    const redirectTo =
      config.get("env") !== "production" ? "/" : "https://www.argos-ci.com";
    res.redirect(redirectTo);
  });

  router.get("/auth/google/login", (req, res) => {
    const redirect = checkIsPathname(req.query["r"]) ? req.query["r"] : "/";
    res.redirect(getGoogleAuthUrl({ redirect }));
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

  router.get("*", (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });

  app.use(subdomain(router, "app"));
};

/**
 * Check if the input is a valid pathname.
 */
function checkIsPathname(input: unknown): input is string {
  return typeof input === "string" && input.startsWith("/");
}
