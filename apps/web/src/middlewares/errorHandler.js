/* eslint-disable no-console */

import * as Sentry from "@sentry/node";
import expressErr from "express-err";

export function errorHandler({ formatters }) {
  return [
    Sentry.Handlers.errorHandler(),
    (error, req, res, next) => {
      if (process.env.NODE_ENV !== "test") {
        console.log(error, error.stack);
      }
      next(error);
    },
    expressErr({
      exitOnUncaughtException: false,
      formatters,
    }),
  ];
}
