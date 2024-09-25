import { Application, Router } from "express";

import { apiMiddleware as githubApiMiddleware } from "../middlewares/github.js";
import { subdomain } from "../util.js";
import auth from "./auth.js";
import builds from "./builds.js";
import status from "./status.js";
import stripe from "./stripe.js";
import v2 from "./v2.js";

export const installApiRouter = (app: Application) => {
  const router = Router();

  router.use(status);
  router.use(githubApiMiddleware);
  router.use("/v2", v2);
  router.use(builds);
  router.use(auth);
  router.use(stripe);

  app.use(subdomain(router, "api"));
};
