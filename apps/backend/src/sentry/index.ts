import * as Sentry from "@sentry/node";

import config from "@/config";
import { checkOctokitErrorStatus } from "@/github";

export function setup() {
  Sentry.init({
    dsn: config.get("sentry.serverDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
    beforeSend(event, hint) {
      const error = hint.originalException;
      // Detect HTTP-like errors
      if (
        error instanceof Error &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
      ) {
        // Set level to info for 4xx errors
        if (error.statusCode >= 400 && error.statusCode < 500) {
          event.level = "info";
          return event;
        }
      }
      // If it's a 504 from GitHub, we can't do anything, so use info.
      if (checkOctokitErrorStatus(504, error)) {
        event.level = "info";
        return event;
      }
      return event;
    },
  });
}
