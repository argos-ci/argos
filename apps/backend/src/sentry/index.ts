import * as Sentry from "@sentry/node";

import config from "@/config";
import { getOctokitErrorStatus } from "@/github/error";
import { isHttp2GoAwayCode0Error } from "@/util/error";

const piiKeys = { deny: ["forwarded", "-ip", "remote-", "via", "-user"] };

export function setup() {
  Sentry.init({
    dsn: config.get("sentry.serverDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
    // What v10 collected without `sendDefaultPii`: its v11 replacement,
    // `dataCollection`, collects every category unless told otherwise.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: piiKeys, response: piiKeys },
      httpBodies: [],
      urlQueryParams: piiKeys,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      // v10 attached the document with its literals redacted whatever
      // `sendDefaultPii` said, and never the variables.
      graphQL: { document: true, variables: false },
    },
    // v11 gives `captureMessage` a synthetic stack trace, and Sentry groups on
    // it: every "GraphQLWrongQuery" would collapse into a single issue.
    attachStacktrace: false,
    integrations: [
      Sentry.pinoIntegration(),
      // A middleware span only ends once the rest of the chain has returned,
      // holding a `finish` listener on the response until then: every REST
      // API request logged a MaxListenersExceededWarning.
      // https://github.com/getsentry/sentry-javascript/issues/24853
      Sentry.expressIntegration({ ignoreLayersType: ["middleware"] }),
    ],
    tracesSampler(samplingContext) {
      const { attributes } = samplingContext;

      // Reduce sampling of "/github/event-handler", we have a ton. Match on
      // attributes: an incoming request's span is only named after its method
      // when the sampler runs.
      if (
        attributes["http.request.method"] === "POST" &&
        attributes["url.path"] === "/github/event-handler"
      ) {
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

      // Ignore suspended GitHub installations, this is expected and actionable
      // by the user, not by us.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "GITHUB_INSTALLATION_SUSPENDED"
      ) {
        return null;
      }

      // Detect HTTP-like errors
      if (
        error instanceof Error &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
      ) {
        // Keep 413 "Payload Too Large" at error level: we always want to be
        // notified when a request body exceeds the configured limit.
        if (error.statusCode === 413) {
          event.level = "error";
          return event;
        }

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
