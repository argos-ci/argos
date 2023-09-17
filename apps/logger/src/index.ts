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
    const firstArg = args[0];

    if (process.env["NODE_ENV"] === "test") {
      if (firstArg instanceof Error) {
        throw firstArg;
      } else {
        throw new Error("Unknown error: " + firstArg);
      }
    }

    if (firstArg instanceof Error) {
      Sentry.captureException(firstArg, (scope) => {
        if (firstArg.cause) {
          scope.setExtra("cause", firstArg.cause);
        }
        return scope;
      });
    } else {
      Sentry.captureMessage(
        typeof firstArg === "string" ? firstArg : "Unknown error",
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
