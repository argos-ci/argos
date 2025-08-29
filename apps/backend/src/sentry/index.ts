import * as Sentry from "@sentry/node";

import config from "@/config/index.js";
import { HTTPError } from "@/web/util";

export function setup() {
  Sentry.init({
    dsn: config.get("sentry.serverDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof HTTPError) {
        // Set level to info for 4xx errors
        if (error.statusCode >= 400 && error.statusCode < 500) {
          event.level = "info";
          return event;
        }
      }
      return event;
    },
  });
}
