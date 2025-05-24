import * as Sentry from "@sentry/node";

const LOG_LEVEL = process.env["LOG_LEVEL"]?.toLowerCase();

const logger = {
  info: (message: string, context?: Record<string, any>) => {
    if (process.env["NODE_ENV"] === "test") {
      return;
    }
    if (context) {
      console.info(message, JSON.stringify(context));
    } else {
      console.info(message);
    }
  },
  error: (message: string, context?: Record<string, any>) => {
    const errorToCapture = context?.error instanceof Error ? context.error : new Error(message);

    if (process.env["NODE_ENV"] === "test") {
      // In test mode, re-throw the error to fail tests, similar to previous behavior.
      // If context.error is the actual error, throw that. Otherwise, throw a new error with the message.
      if (context?.error instanceof Error) {
        throw context.error;
      } else {
        // Augment the new error with context if available, for better test failure information
        const testError = new Error(message);
        // @ts-ignore
        if (context) testError.context = context;
        throw testError;
      }
    }

    Sentry.captureException(errorToCapture, (scope) => {
      scope.setExtra("message", message); // Add original message to Sentry
      if (context) {
        const { error, ...restOfContext } = context; // Separate error from other context
        scope.setExtras(restOfContext); // Add all other context as extras
        if (error instanceof Error && error.cause) {
          scope.setExtra("cause", error.cause);
        }
      }
      return scope;
    });

    if (context) {
      console.error(message, JSON.stringify(context));
    } else {
      console.error(message);
    }
  },
  success: (message: string, context?: Record<string, any>) => {
    if (process.env["NODE_ENV"] === "test") {
      return;
    }
    if (context) {
      console.log(message, JSON.stringify(context));
    } else {
      console.log(message);
    }
  },
  warn: (message: string, context?: Record<string, any>) => {
    if (process.env["NODE_ENV"] === "test") {
      return;
    }
    Sentry.captureMessage(message, {
      level: "warning",
      extra: context,
    });
    if (context) {
      console.warn(message, JSON.stringify(context));
    } else {
      console.warn(message);
    }
  },
  debug: (message: string, context?: Record<string, any>) => {
    if (
      process.env["NODE_ENV"] === "test" ||
      (process.env["NODE_ENV"] === "production" && LOG_LEVEL !== "debug")
    ) {
      return;
    }
    if (context) {
      console.debug(message, JSON.stringify(context));
    } else {
      console.debug(message);
    }
  },
};

export default logger;
