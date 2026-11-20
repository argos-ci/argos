import { randomBytes } from "node:crypto";
import { assertNever } from "@argos/util/assertNever";
import { Router, type RequestHandler, type Response } from "express";
import { z } from "zod";

import {
  bindCallbackToBrowser,
  type CallbackProvider,
} from "@/auth/callback-binding";
import config from "@/config";
import { getGoogleAuthUrl } from "@/google";

import { getFirstString, getSafeRedirect } from "./util";

type OAuthProvider = Exclude<CallbackProvider, "saml">;

const QuerySchema = z.object({
  r: z.union([z.string(), z.array(z.string())]).optional(),
});

function getCallbackUrl(provider: OAuthProvider): string {
  return new URL(
    `/auth/${provider}/callback`,
    config.get("server.url"),
  ).toString();
}

function getAuthorizationUrl(provider: OAuthProvider, state: string): string {
  switch (provider) {
    case "github": {
      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.set("scope", "user:email");
      url.searchParams.set("client_id", config.get("github.clientId"));
      url.searchParams.set("redirect_uri", getCallbackUrl(provider));
      url.searchParams.set("state", state);
      return url.toString();
    }
    case "gitlab": {
      const url = new URL("https://gitlab.com/oauth/authorize");
      url.searchParams.set("scope", "read_user");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", config.get("gitlab.appId"));
      url.searchParams.set("redirect_uri", getCallbackUrl(provider));
      url.searchParams.set("state", state);
      return url.toString();
    }
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
  const url = new URL(`${appUrl.pathname}/installations/new`, appUrl.origin);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Issue the `state` of an authorization request, bound to this browser. The
 * callback page reads `redirect` back from it, so it is base64-encoded JSON.
 */
function issueOAuthState(
  res: Response,
  input: { provider: OAuthProvider; redirect: string },
): string {
  const nonce = randomBytes(32).toString("base64url");
  const state = Buffer.from(
    JSON.stringify({ nonce, redirect: input.redirect }),
  ).toString("base64");
  bindCallbackToBrowser(res, { provider: input.provider, value: state });
  return state;
}

/**
 * Start an OAuth flow: issue a state bound to this browser, then send the
 * browser to the provider with it.
 */
function startOAuth(
  provider: OAuthProvider,
  getUrl: (state: string) => string,
): RequestHandler {
  return (req, res) => {
    const query = QuerySchema.safeParse(req.query);
    const redirect = getSafeRedirect(
      query.success ? getFirstString(query.data.r) : undefined,
    );
    const state = issueOAuthState(res, { provider, redirect });
    res.set("Cache-Control", "no-store");
    res.redirect(getUrl(state));
  };
}

const router: Router = Router();

for (const provider of ["github", "gitlab", "google"] as const) {
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
