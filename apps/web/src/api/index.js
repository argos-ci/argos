import * as Sentry from "@sentry/node";
import express from "express";
import { formatters } from "express-err";

import { errorHandler } from "../middlewares/errorHandler";
import auth from "./auth";
import buckets from "./buckets";
import builds from "./builds";
import v2 from "./v2";
import webhooks from "./webhooks";

export const createApi = () => {
  const router = express.Router();

  router.use("/v2", v2);
  router.use(buckets);
  router.use(builds);
  router.use(auth);
  router.use(webhooks);

  router.use(Sentry.Handlers.errorHandler());

  router.use(
    errorHandler({
      formatters: {
        json: formatters.json,
        default: formatters.json,
      },
    })
  );

  return router;
};
