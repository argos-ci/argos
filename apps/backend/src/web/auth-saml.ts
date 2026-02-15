import express, { Router } from "express";
import { z } from "zod";

import {
  checkHasAccessToSAML,
  createSamlAuthCode,
  createSamlLoginRedirect,
  extractEmailFromSaml,
  getSamlSpMetadata,
  parseAndValidateSamlLoginResponse,
} from "@/auth/saml";
import config from "@/config";
import { Account } from "@/database/models";
import { getOrCreateUserAccountFromSaml } from "@/database/services/account";
import { boom } from "@/util/error";

import { asyncHandler } from "./util";

const LoginQuerySchema = z.object({
  r: z.union([z.string(), z.array(z.string())]).optional(),
});

const AcsBodySchema = z.object({
  SAMLResponse: z.string(),
  RelayState: z.string(),
});

function getSafeRedirect(redirect: string | undefined) {
  if (!redirect) {
    return "/";
  }
  if (!redirect.startsWith("/")) {
    return "/";
  }
  return redirect;
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

async function checkTeamSamlEnabled(account: Account) {
  const hasAccessToSAML = await checkHasAccessToSAML(account);
  if (!hasAccessToSAML) {
    throw boom(403, "SAML SSO is only available on Enterprise plan.");
  }
  if (!account.teamSamlConfig || !account.teamSamlConfig.enabled) {
    throw boom(403, "SAML SSO is not enabled for this team.");
  }
  return account.teamSamlConfig;
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
      const samlConfig = await checkTeamSamlEnabled(account);
      const loginUrl = await createSamlLoginRedirect({
        teamSlug,
        samlConfig,
        redirect,
      });
      res.redirect(loginUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start SAML login.";
      const loginUrl = new URL("/login", config.get("server.url"));
      loginUrl.searchParams.set("error", message);
      res.redirect(loginUrl.toString());
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
    const body = AcsBodySchema.parse(req.body);
    const account = await getTeamAccountOrThrow(teamSlug);
    const samlConfig = await checkTeamSamlEnabled(account);
    const parsed = await parseAndValidateSamlLoginResponse({
      teamSlug,
      samlConfig,
      samlResponse: body.SAMLResponse,
      relayState: body.RelayState,
    });
    const email = extractEmailFromSaml(parsed.attributes);
    if (!email) {
      throw boom(401, "No email attribute found in SAML response.");
    }

    const userAccount = await getOrCreateUserAccountFromSaml({
      email,
      teamAccount: account,
      ssoSubject: parsed.subject ?? email,
    });

    const code = await createSamlAuthCode({
      accountId: userAccount.id,
      teamSlug,
      redirect: parsed.loginState.redirect,
    });
    const loginUrl = new URL("/auth/saml/callback", config.get("server.url"));
    loginUrl.searchParams.set("code", code);
    loginUrl.searchParams.set(
      "state",
      Buffer.from(
        JSON.stringify({ nonce: "none", redirect: parsed.loginState.redirect }),
      ).toString("base64"),
    );
    res.redirect(loginUrl.toString());
  }),
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
