/* eslint-disable no-console */
import * as Sentry from "@sentry/node";

const logger = {
  info: (...args: any[]) => {
    if (process.env["NODE_ENV"] === "test") {
      return;
    }

    console.info(...args);
  },
  error: (...args: any[]) => {
    if (process.env["NODE_ENV"] === "test") {
      throw new Error(args[0]);
    }

    if (args[0] instanceof Error) {
      Sentry.captureException(args[0]);
    } else {
      Sentry.captureMessage(
        typeof args[0] === "string" ? args[0] : "Unknown error",
        {
          extra: { args },
        },
      );
    }
    console.error(...args);
  },
  success: (...args: any[]) => {
    if (process.env["NODE_ENV"] === "test") {
      return;
    }

    console.log(...args);
  },
};

export default logger;
