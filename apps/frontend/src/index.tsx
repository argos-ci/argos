import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { config } from "./config";

import "./index.css";

import { invariant } from "@argos/util/invariant";

import { APIError } from "./util/api";

if (process.env["NODE_ENV"] === "production") {
  Sentry.init({
    dsn: config.sentry.clientDsn,
    environment: config.sentry.environment,
    release: config.releaseVersion,
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof APIError) {
        // Invalid grant errors are not errors that should be reported.
        // See https://stackoverflow.com/a/38433986
        if (error.message === "invalid_grant") {
          event.level = "info";
          return event;
        }
        // If the account is already attached, we don't need to report it,
        // as it's a user error.
        if (
          // GitHub
          error.code === "GITHUB_ACCOUNT_ALREADY_ATTACHED" ||
          error.code === "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GITHUB" ||
          // GitHub OAuth errors are also user errors.
          error.code === "GITHUB_AUTH_INCORRECT_CLIENT_CREDENTIALS" ||
          error.code === "GITHUB_AUTH_REDIRECT_URI_MISMATCH" ||
          error.code === "GITHUB_AUTH_BAD_VERIFICATION_CODE" ||
          error.code === "GITHUB_AUTH_UNVERIFIED_USER_EMAIL" ||
          error.code === "GITHUB_NO_VERIFIED_EMAIL" ||
          // GitLab
          error.code === "GITLAB_ACCOUNT_ALREADY_ATTACHED" ||
          error.code === "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GITLAB" ||
          // Google
          error.code === "GOOGLE_ACCOUNT_ALREADY_ATTACHED" ||
          error.code === "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GOOGLE"
        ) {
          event.level = "info";
          return event;
        }
      }
      return event;
    },
  });
}

const container = document.querySelector("#root");
invariant(container, "No #root element found");

const root = createRoot(container, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  // Callback called when React catches an error in an ErrorBoundary.
  onCaughtError: Sentry.reactErrorHandler(),
  // Callback called when React automatically recovers from errors.
  onRecoverableError: Sentry.reactErrorHandler(),
});
root.render(<App />);
