import * as Sentry from "@sentry/node";

import config from "@/config";
import { checkOctokitErrorStatus, getOctokitErrorStatus } from "@/github";
import { isHttp2GoAwayCode0Error } from "@/util/error";

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

      const octokitErrorStatus = getOctokitErrorStatus(error);

      // 5xx from GitHub are set to info level
      if (typeof octokitErrorStatus === "number" && octokitErrorStatus >= 500) {
        event.level = "info";
        return event;
      }

      // GitHub can return random "GOAWAY"
      if (isHttp2GoAwayCode0Error(error)) {
        event.level = "info";
        return event;
      }
      return event;
    },
  });
}
