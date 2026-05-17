import * as Sentry from "@sentry/node";

import config from "@/config";
import { getOctokitErrorStatus } from "@/github/error";
import { isHttp2GoAwayCode0Error } from "@/util/error";

export function setup() {
  Sentry.init({
    dsn: config.get("sentry.serverDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
    enableLogs: true,
    integrations: [Sentry.pinoIntegration()],
    tracesSampler(samplingContext) {
      // Reduce sampling of "/github/event-handler", we have a ton.
      if (samplingContext.name === "POST /github/event-handler") {
        return samplingContext.inheritOrSampleWith(0.0001);
      }

      // We want to log every cron, they don't run often.
      if (samplingContext.name === "cron.run") {
        return samplingContext.inheritOrSampleWith(1);
      }

      // Else use the default sample rate.
      return samplingContext.inheritOrSampleWith(
        config.get("sentry.tracesSampleRate"),
      );
    },
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
