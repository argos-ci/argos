import express, { Router, type ErrorRequestHandler } from "express";
import { z } from "zod";

import {
  checkHasAccessToSAML,
  checkTeamSamlEnabled,
  createSamlAuthCode,
  createSamlLoginRedirect,
  extractEmailFromSaml,
  getSamlSpMetadata,
  parseAndValidateSamlLoginResponse,
} from "@/auth/saml";
import config from "@/config";
import { Account } from "@/database/models";
import { boom, HTTPError } from "@/util/error";

import { asyncHandler } from "./util";

const LoginQuerySchema = z.object({
  r: z.union([z.string(), z.array(z.string())]).optional(),
});

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
 * The IdP's page posts to the ACS, so a rejected login goes back to the login
 * page with the reason instead of ending on a bare error response.
 */
const redirectRejectedLoginToLoginPage: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (error instanceof HTTPError && error.statusCode < 500) {
    res.redirect(getLoginErrorUrl(error.message));
    return;
  }
  next(error);
};

/**
 * A same-origin path to land on after login. Resolved with the URL parser
 * rather than matched as a string: `//evil.example` and `/\evil.example` both
 * start with a slash and both leave the origin.
 */
function getSafeRedirect(redirect: string | undefined) {
  if (!redirect) {
    return "/";
  }
  const origin = new URL(config.get("server.url")).origin;
  let url: URL;
  try {
    url = new URL(redirect, origin);
  } catch {
    return "/";
  }
  if (url.origin !== origin) {
    return "/";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function getFirstString(input: string | string[] | undefined) {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input[0];
  }
  return undefined;
}

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
  return result.samlConfig;
}

const router: Router = Router();

router.get(
  "/auth/saml/:teamSlug/login",
  asyncHandler(async (req, res) => {
    try {
      const teamSlug = getFirstString(req.params["teamSlug"]);
      if (!teamSlug) {
        throw boom(400, "Team slug is missing.");
      }
      const query = LoginQuerySchema.safeParse(req.query);
      const redirect = getSafeRedirect(
        query.success ? getFirstString(query.data.r) : undefined,
      );
      const account = await getTeamAccountOrThrow(teamSlug);
      const samlConfig = await getEnabledTeamSamlConfig(account);
      const loginUrl = await createSamlLoginRedirect({
        teamSlug,
        samlConfig,
        redirect,
      });
      res.redirect(loginUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start SAML login.";
      res.redirect(getLoginErrorUrl(message));
    }
  }),
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
      throw boom(400, "SAML response is missing.");
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
      Buffer.from(
        JSON.stringify({ nonce: "none", redirect: parsed.redirect }),
      ).toString("base64"),
    );
    res.redirect(loginUrl.toString());
  }),
  redirectRejectedLoginToLoginPage,
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
