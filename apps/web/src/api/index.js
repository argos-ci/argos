import { formatters } from "express-err";
import express from "express";
import * as Sentry from "@sentry/node";
import { errorHandler } from "../middlewares/errorHandler";
import buckets from "./buckets";
import builds from "./builds";
import auth from "./auth";
import webhooks from "./webhooks";
import v2 from "./v2";

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
