import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { invariant } from "@argos/util/invariant";
import { Handlers } from "@sentry/node";
import express, { Router, static as serveStatic } from "express";

import config from "@/config/index.js";
import { getGoogleAuthUrl } from "@/google/index.js";
import { apolloServer, createApolloMiddleware } from "@/graphql/index.js";

import { emailPreview } from "../email/express.js";
import { auth } from "./middlewares/auth.js";
import { subdomain } from "./util.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const installAppRouter = async (app: express.Application) => {
  const router = Router();

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

  // Static directory
  router.use(
    "/static/app",
    serveStatic(join(__dirname, "../../../frontend/dist"), {
      etag: true,
      lastModified: false,
      maxAge: "1 year",
      index: false,
    }),
  );

  if (config.get("env") !== "production") {
    router.use("/email-preview", emailPreview);
  }

  await apolloServer.start();
  router.use("/graphql", express.json(), createApolloMiddleware());

  router.use(auth);

  router.get("/auth/logout", (req, res) => {
    // @ts-ignore
    req.logout();
    if (config.get("env") !== "production") {
      res.redirect("/");
    } else {
      res.redirect("https://www.argos-ci.com/");
    }
  });

  router.get("/auth/google/login", (req, res) => {
    const r = req.query["r"];
    invariant(typeof r === "string", "Expected r to be a string");
    res.redirect(getGoogleAuthUrl({ r }));
  });

  router.use(Handlers.errorHandler());

  app.use(subdomain(router, "app"));
};
