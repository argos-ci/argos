import { assertNever } from "@argos/util/assertNever";
import { Router, type RequestHandler } from "express";

import {
  getCallbackUrl,
  issueCallbackState,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "@/auth/callback-binding";
import config from "@/config";
import { getGoogleAuthUrl } from "@/google";

import { getLoginRedirect } from "./util";

function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function getAuthorizationUrl(provider: OAuthProvider, state: string): string {
  switch (provider) {
    case "github":
      return withParams("https://github.com/login/oauth/authorize", {
        scope: "user:email",
        client_id: config.get("github.clientId"),
        redirect_uri: getCallbackUrl(provider),
        state,
      });
    case "gitlab":
      return withParams("https://gitlab.com/oauth/authorize", {
        scope: "read_user",
        response_type: "code",
        client_id: config.get("gitlab.appId"),
        redirect_uri: getCallbackUrl(provider),
        state,
      });
    case "google":
      return getGoogleAuthUrl({
        clientId: config.get("google.clientId"),
        clientSecret: config.get("google.clientSecret"),
        redirectUri: getCallbackUrl(provider),
        state,
      });
    default:
      assertNever(provider);
  }
}

/**
 * Installing the main GitHub App ends on the GitHub OAuth callback, so the
 * install carries a state like a login does.
 */
function getGitHubAppInstallUrl(state: string): string {
  const appUrl = new URL(config.get("github.appUrl"));
  return withParams(`${appUrl.origin}${appUrl.pathname}/installations/new`, {
    state,
  });
}

function startOAuth(
  provider: OAuthProvider,
  getUrl: (state: string) => string,
): RequestHandler {
  return (req, res) => {
    const state = issueCallbackState(res, {
      provider,
      redirect: getLoginRedirect(req.query),
    });
    res.set("Cache-Control", "no-store");
    res.redirect(getUrl(state));
  };
}

const router: Router = Router();

for (const provider of OAUTH_PROVIDERS) {
  router.get(
    `/auth/${provider}/login`,
    startOAuth(provider, (state) => getAuthorizationUrl(provider, state)),
  );
}

router.get(
  "/auth/github/install",
  startOAuth("github", getGitHubAppInstallUrl),
);

export default router;
