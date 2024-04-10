import { Application, Router } from "express";
// @ts-ignore
import { formatters } from "express-err";

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
  router.use("/v2", v2);
  router.use(builds);
  router.use(auth);
  router.use(webhooksMiddleware);
  router.use(stripe);

  router.use(
    errorHandler({
      formatters: {
        json: formatters.json,
        default: formatters.json,
      },
    }),
  );

  app.use(subdomain(router, "api"));
};
