import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { config } from "./config";

import "./index.css";

import { invariant } from "@argos/util/invariant";

import { APIError } from "./util/api";
import { getSingleErrorCode } from "./util/error";

if (process.env["NODE_ENV"] === "production") {
  Sentry.init({
    dsn: config.sentry.clientDsn,
    environment: config.sentry.environment,
    release: config.releaseVersion,
    ignoreErrors: [/^Unable to preload CSS/],
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error instanceof APIError && error.message === "invalid_grant") {
        // Invalid grant errors are not errors that should be reported.
        // See https://stackoverflow.com/a/38433986
        event.level = "info";
        return event;
      }

      const code = getSingleErrorCode(error);

      // Never notify "SAML_SSO_REQUIRED", it's handled
      if (code === "SAML_SSO_REQUIRED") {
        return null;
      }

      // If the account is already attached, we don't need to report it,
      // as it's a user error.
      if (
        // GitHub
        code === "GITHUB_ACCOUNT_ALREADY_ATTACHED" ||
        code === "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GITHUB" ||
        code === "GITHUB_NO_VERIFIED_EMAIL" ||
        // GitHub OAuth errors are also user errors.
        code === "GITHUB_AUTH_INCORRECT_CLIENT_CREDENTIALS" ||
        code === "GITHUB_AUTH_REDIRECT_URI_MISMATCH" ||
        code === "GITHUB_AUTH_BAD_VERIFICATION_CODE" ||
        code === "GITHUB_AUTH_UNVERIFIED_USER_EMAIL" ||
        // GitLab
        code === "GITLAB_ACCOUNT_ALREADY_ATTACHED" ||
        code === "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GITLAB" ||
        code === "GITLAB_NO_VERIFIED_EMAIL" ||
        // Google
        code === "GOOGLE_ACCOUNT_ALREADY_ATTACHED" ||
        code === "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GOOGLE" ||
        code === "GOOGLE_NO_VERIFIED_EMAIL"
      ) {
        event.level = "info";
        return event;
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
