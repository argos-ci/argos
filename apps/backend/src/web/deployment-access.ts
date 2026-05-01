import { Router } from "express";
import { z } from "zod";

import { signDeploymentAccessToken } from "@/auth/deployment-access";
import { verifyJWT } from "@/auth/jwt";
import config from "@/config";
import { Account, Project } from "@/database/models";
import { resolveDeploymentByDomain } from "@/deployment/resolve";
import { boom } from "@/util/error";

import { asyncHandler } from "./util";

const QuerySchema = z.object({
  return_to: z.string(),
});

const AUTH_COOKIE_NAME = "argos_jwt";

function readAuthCookie(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    if (trimmed.slice(0, eq) === AUTH_COOKIE_NAME) {
      return trimmed.slice(eq + 1) || null;
    }
  }
  return null;
}

/**
 * Validate that `return_to` points at one of our deployment domains. We use the
 * URL only as a redirect target, so it must be HTTPS and live under the
 * deployments base domain — otherwise this endpoint becomes an open redirect.
 */
function parseReturnTo(input: string): URL | null {
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
  if (hostname !== baseDomain && !hostname.endsWith(`.${baseDomain}`)) {
    return null;
  }
  return url;
}

const router: Router = Router();

router.get(
  "/auth/deployments",
  asyncHandler(async (req, res) => {
    const parsedQuery = QuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      throw boom(400, "Missing return_to");
    }

    const returnTo = parseReturnTo(parsedQuery.data.return_to);
    if (!returnTo) {
      throw boom(400, "Invalid return_to");
    }

    const cookieToken = readAuthCookie(req.headers.cookie);
    const session = cookieToken ? verifyJWT(cookieToken) : null;
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
      .findById(session.account.id);
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

    // Don't let the browser cache this redirect — the token is one-shot.
    res.set("Cache-Control", "no-store");
    res.redirect(callbackUrl.toString());
  }),
);

export default router;
