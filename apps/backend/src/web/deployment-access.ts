import { Router } from "express";
import { z } from "zod";

import { signDeploymentAccessToken } from "@/auth/deployment-access";
import { resolveSession } from "@/auth/session";
import { readSessionCookie } from "@/auth/session-cookie";
import config from "@/config";
import { Account, Project, ProjectDomain } from "@/database/models";
import { resolveDeploymentByDomain } from "@/deployment/resolve";
import { boom } from "@/util/error";

import { asyncHandler } from "./util";

const QuerySchema = z.object({
  return_to: z.string(),
});

/**
 * Validate that `return_to` points at one of our deployment domains. We use the
 * URL only as a redirect target — and it carries a signed access token — so an
 * unvalidated host turns this endpoint into a token-leaking open redirect.
 *
 * Custom domains cannot be recognised by their shape, so they are checked
 * against the domains we actually serve. Only `active` rows count: a `pending`
 * one is a hostname a customer has claimed but not yet proven, and honouring it
 * would let anyone redirect the token to a host they merely typed into a form.
 */
async function parseReturnTo(input: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") {
    return null;
  }

  const baseDomain = config.get("deployments.baseDomain").toLowerCase();
  const hostname = url.hostname.toLowerCase();
  if (hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)) {
    return url;
  }

  const customDomain = await ProjectDomain.query()
    .select("id")
    .findOne({ domain: hostname, internal: false, status: "active" });

  return customDomain ? url : null;
}

const router: Router = Router();

router.get(
  "/auth/deployments",
  asyncHandler(async (req, res) => {
    const parsedQuery = QuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      throw boom(400, "Missing return_to");
    }

    const returnTo = await parseReturnTo(parsedQuery.data.return_to);
    if (!returnTo) {
      throw boom(400, "Invalid return_to");
    }

    const rawToken = readSessionCookie(req);
    const session = rawToken ? await resolveSession(rawToken) : null;
    if (!session) {
      const requestUrl = new URL(req.originalUrl, config.get("server.url"));
      const loginUrl = new URL("/login", config.get("server.url"));
      loginUrl.searchParams.set("r", requestUrl.toString());
      res.redirect(loginUrl.toString());
      return;
    }

    const deployment = await resolveDeploymentByDomain(returnTo.toString());
    if (!deployment) {
      throw boom(404, "Deployment not found");
    }

    const account = await Account.query()
      .withGraphFetched("user")
      .findOne({ userId: session.userId });
    if (!account?.user) {
      throw boom(401, "Invalid session");
    }

    const project = await Project.query().findById(deployment.projectId);
    if (!project) {
      throw boom(404, "Project not found");
    }

    const permissions = await Project.getPermissions(project, account.user);
    if (!permissions.includes("view")) {
      throw boom(403, "You do not have access to this deployment");
    }

    const token = signDeploymentAccessToken({
      projectId: deployment.projectId,
      sub: account.user.id,
    });

    const callbackUrl = new URL("/__argos/auth", returnTo.origin);
    callbackUrl.searchParams.set("token", token);
    callbackUrl.searchParams.set(
      "return_to",
      `${returnTo.pathname}${returnTo.search}${returnTo.hash}`,
    );

    // Don't let the browser cache this redirect because it carries a sensitive
    // deployment-access token that remains valid until it expires.
    res.set("Cache-Control", "no-store");
    res.redirect(callbackUrl.toString());
  }),
);

export default router;
