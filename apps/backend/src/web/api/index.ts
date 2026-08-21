import cors from "cors";
import { Application, Router } from "express";

import { getProtectedResourceMetadata } from "@/oauth/metadata";

import { apiMiddleware as githubApiMiddleware } from "../middlewares/github";
import { apiMiddleware as resendApiMiddleware } from "../middlewares/resend";
import { subdomain } from "../util";
import { argosHeadersMiddleware } from "./argosHeaders";
import auth from "./auth";
import builds from "./builds";
import status from "./status";
import stripe from "./stripe";
import v2 from "./v2";

export const installApiRouter = (app: Application) => {
  const router = Router();

  router.use(status);
  router.use(githubApiMiddleware);
  router.use(resendApiMiddleware);
  router.use(argosHeadersMiddleware);
  // RFC 9728 Protected Resource Metadata for the REST API, pointing MCP/OAuth
  // clients at the Authorization Server.
  router.get(
    "/.well-known/oauth-protected-resource",
    cors({ origin: "*" }),
    (_req, res) => {
      res.json(getProtectedResourceMetadata());
    },
  );
  router.use("/v2", v2);
  router.use(builds);
  router.use(auth);
  router.use(stripe);

  app.use(subdomain(router, "api"));
};
