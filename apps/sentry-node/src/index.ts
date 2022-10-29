import { init } from "@sentry/node";

// import config from "@argos-ci/config";

export function setup() {
  init({
    // dsn: config.get("sentry.serverDsn"),
    // environment: config.get("sentry.environment"),
    // release: config.get("releaseVersion"),
  });
}

export * from "@sentry/node";
