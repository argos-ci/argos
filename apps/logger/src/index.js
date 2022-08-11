/* eslint-disable no-console */
import * as Sentry from "@sentry/node";

const logger = {
  info: (...args) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    console.info(...args);
  },
  error: (...args) => {
    if (process.env.NODE_ENV === "test") {
      throw new Error(args);
    }

    if (args[0] instanceof Error) {
      Sentry.captureException(args[0]);
    } else if (typeof args[0] === "string") {
      Sentry.captureMessage(args[0]);
    }
    console.error(...args);
  },
  success: (...args) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    console.log(...args);
  },
};

export default logger;
