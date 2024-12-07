import * as Sentry from "@sentry/node";

import config from "@/config/index.js";

export function setup() {
  Sentry.init({
    dsn: config.get("sentry.serverDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
  });
}
