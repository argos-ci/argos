import express, { Router, type ErrorRequestHandler } from "express";
import { z } from "zod";

import { issueCallbackState } from "@/auth/callback-binding";
import {
  checkHasAccessToSAML,
  checkTeamSamlEnabled,
  claimTeamSamlSlug,
  createSamlAuthCode,
  createSamlLoginRedirect,
  extractEmailFromSaml,
  getSamlSpMetadata,
  parseAndValidateSamlLoginResponse,
} from "@/auth/saml";
import config from "@/config";
import { Account } from "@/database/models";
import logger from "@/logger";
import { boom, HTTPError } from "@/util/error";

import { asyncHandler, getFirstString, getLoginRedirect } from "./util";

const AcsBodySchema = z.object({
  SAMLResponse: z.string(),
  RelayState: z.string().optional(),
});

function getLoginErrorUrl(message: string) {
  const loginUrl = new URL("/login", config.get("server.url"));
  loginUrl.searchParams.set("error", message);
  return loginUrl.toString();
}

/**
 * The browser reaches these routes by navigation (the IdP's page posts to the
 * ACS), so a failed login goes back to the login page with the reason instead
 * of ending on a bare error response.
 */
const redirectFailedLoginToLoginPage: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof HTTPError && error.statusCode < 500) {
    res.redirect(getLoginErrorUrl(error.message));
    return;
  }
  logger.error({ error }, "SAML login failed");
  res.redirect(
    getLoginErrorUrl("SAML login failed on the Argos side. Try again shortly."),
  );
};

async function getTeamAccountOrThrow(teamSlug: string) {
  const account = await Account.query()
    .withGraphFetched("teamSamlConfig")
    .findOne({ slug: teamSlug });

  if (!account || !account.teamId) {
    throw boom(404, "Team not found.");
  }
  return account;
}

async function getEnabledTeamSamlConfig(account: Account) {
  const result = await checkTeamSamlEnabled(account);
  if (!result.enabled) {
    throw boom(403, result.reason);
  }
  if (!(await claimTeamSamlSlug(account))) {
    throw boom(
      403,
      "This team URL was used for another team's SAML SSO, so it cannot be used for SAML again. A team admin can rename the team to set up SAML.",
    );
  }
  return result.samlConfig;
}

const router: Router = Router();

router.get(
  "/auth/saml/:teamSlug/login",
  asyncHandler(async (req, res) => {
    const teamSlug = getFirstString(req.params["teamSlug"]);
    if (!teamSlug) {
      throw boom(400, "Team slug is missing.");
    }
    const redirect = getLoginRedirect(req.query);
    const account = await getTeamAccountOrThrow(teamSlug);
    const samlConfig = await getEnabledTeamSamlConfig(account);
    const loginUrl = await createSamlLoginRedirect({
      teamSlug,
      samlConfig,
      redirect,
    });
    res.redirect(loginUrl);
  }),
  redirectFailedLoginToLoginPage,
);

router.post(
  "/auth/saml/:teamSlug/acs",
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    const teamSlug = getFirstString(req.params["teamSlug"]);
    if (!teamSlug) {
      throw boom(400, "Team slug is missing.");
    }
    const body = AcsBodySchema.safeParse(req.body);
    if (!body.success) {
      throw boom(
        400,
        "Argos could not read the SAML response. Try signing in again.",
      );
    }
    const account = await getTeamAccountOrThrow(teamSlug);
    const samlConfig = await getEnabledTeamSamlConfig(account);
    const parsed = await parseAndValidateSamlLoginResponse({
      teamSlug,
      samlConfig,
      samlResponse: body.data.SAMLResponse,
      relayState: body.data.RelayState ?? null,
    });

    // For Okta email is the subject (NameID)
    const email = extractEmailFromSaml(parsed.attributes) ?? parsed.subject;

    if (!email || !z.email().safeParse(email).success) {
      throw boom(401, "No email attribute found in SAML response.");
    }

    // The account is resolved when the code is exchanged, not here: this POST
    // comes from the IdP's page, so the browser sends no session cookie, and
    // whether the person is signed in decides which account they may link.
    const code = await createSamlAuthCode({
      teamAccountId: account.id,
      email,
      ssoSubject: parsed.subject ?? email,
    });
    const loginUrl = new URL("/auth/saml/callback", config.get("server.url"));
    loginUrl.searchParams.set("code", code);
    loginUrl.searchParams.set(
      "state",
      issueCallbackState(res, { provider: "saml", redirect: parsed.redirect }),
    );
    res.redirect(loginUrl.toString());
  }),
  redirectFailedLoginToLoginPage,
);

router.get(
  "/auth/saml/:teamSlug/metadata.xml",
  asyncHandler(async (req, res) => {
    const teamSlug = getFirstString(req.params["teamSlug"]);
    if (!teamSlug) {
      throw boom(400, "Team slug is missing.");
    }
    const account = await getTeamAccountOrThrow(teamSlug);
    const hasAccessToSAML = await checkHasAccessToSAML(account);
    if (!hasAccessToSAML) {
      throw boom(403, "SAML SSO is only available on Enterprise plan.");
    }
    res.setHeader("Content-Type", "application/xml");
    res.send(getSamlSpMetadata(teamSlug));
  }),
);

export default router;
