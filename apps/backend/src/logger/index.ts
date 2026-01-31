import * as Sentry from "@sentry/node";
import pino from "pino";

import config from "@/config";

const logger = pino({
  level: config.get("logLevel"),
  hooks: {
    logMethod(inputArgs, method, level) {
      const parsed = parseArgs(inputArgs);
      // If warning or more and there is an error
      if (level >= 40 && parsed.error) {
        Sentry.withScope((scope) => {
          scope.setExtras(parsed.obj);
          scope.setLevel(
            level >= 60
              ? "fatal"
              : level >= 50
                ? "error"
                : level >= 40
                  ? "warning"
                  : "info",
          );
          Sentry.captureException(parsed.error);
        });
      }
      if (parsed.error) {
        return method.apply(this, [
          {
            ...parsed.obj,
            error: {
              message: parsed.error.message,
              stack: parsed.error.stack,
            },
          },
          parsed.msg,
        ]);
      }
      return method.apply(this, inputArgs);
    },
  },
});

function parseArgs(
  inputArgs: [obj: unknown, msg?: string | undefined, ...args: unknown[]],
) {
  const [obj, msg] = inputArgs;
  if (
    typeof obj === "object" &&
    obj &&
    "error" in obj &&
    obj.error instanceof Error
  ) {
    const { error, ...rest } = obj;
    return { obj: rest, error, msg };
  }
  return { obj, error: null, msg };
}

export default logger;
