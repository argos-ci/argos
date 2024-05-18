import { Application, Router } from "express";

import { errorHandler } from "../middlewares/errorHandler.js";
import { subdomain } from "../util.js";
import auth from "./auth.js";
import builds from "./builds.js";
import { webhooksMiddleware } from "./github.js";
import status from "./status.js";
import stripe from "./stripe.js";
import v2 from "./v2/index.js";

export const installApiRouter = (app: Application) => {
  const router = Router();

  router.use(status);
  router.use(webhooksMiddleware);
  router.use("/v2", v2);
  router.use(builds);
  router.use(auth);
  router.use(stripe);

  router.use(errorHandler());

  app.use(subdomain(router, "api"));
};
