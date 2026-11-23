import { assertNever } from "@argos/util/assertNever";
import { Router, type RequestHandler } from "express";
import { z } from "zod";

import {
  getCallbackUrl,
  issueCallbackState,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "@/auth/callback-binding";
import { signInstallState } from "@/auth/install-state";
import { safeSessionAuthFromExpressReq } from "@/auth/session-request";
import config from "@/config";
import { Account } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { getGoogleAuthUrl } from "@/google";
import { boom } from "@/util/error";

import { asyncHandler, getLoginRedirect } from "./util";

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
 * `/installations/new` lets you manage an app already installed too.
 */
function getGitHubAppInstallUrl(appUrl: string, state: string): string {
  const url = new URL(appUrl);
  return withParams(`${url.origin}${url.pathname}/installations/new`, {
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
      reauthenticate: req.query["reauthenticate"] === "true",
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

// Installing the main GitHub App ends on the GitHub OAuth callback, so the
// install carries a state like a login does.
router.get(
  "/auth/github/install",
  startOAuth("github", (state) =>
    getGitHubAppInstallUrl(config.get("github.appUrl"), state),
  ),
);

const LightInstallQuerySchema = z.object({
  accountId: z.string().refine(isValidPgBigInt),
});

/**
 * Installing the light app ends on its setup URL, which links the
 * installation to the account its state names: the state is signed here, on
 * click, and only for an admin of the account.
 */
router.get(
  "/auth/github-light/install",
  asyncHandler(async (req, res) => {
    const query = LightInstallQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw boom(400, "Invalid query parameters");
    }

    const auth = await safeSessionAuthFromExpressReq(req);
    if (!auth) {
      const requestUrl = new URL(req.originalUrl, config.get("server.url"));
      const loginUrl = new URL("/login", config.get("server.url"));
      loginUrl.searchParams.set("r", requestUrl.toString());
      res.redirect(loginUrl.toString());
      return;
    }

    const account = await Account.query().findById(query.data.accountId);
    if (!account || !(await account.$getPermissions(auth)).includes("admin")) {
      throw boom(404, "Account not found");
    }

    const state = signInstallState("github-light-install", {
      accountId: account.id,
    });
    res.set("Cache-Control", "no-store");
    res.redirect(
      getGitHubAppInstallUrl(config.get("githubLight.appUrl"), state),
    );
  }),
);

export default router;
