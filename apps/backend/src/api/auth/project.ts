import type { Request } from "express";

import {
  getAuthHeaderFromExpressReq,
  parseBearerFromHeader,
} from "@/auth/auth-header";
import type {
  AuthPATPayload,
  AuthProjectPayload,
  AuthSessionPayload,
} from "@/auth/payload";
import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import { getAuthPayloadFromUserAccessToken } from "@/auth/user-access-token";
import { Project, UserAccessToken } from "@/database/models";
import { boom } from "@/util/error";

/**
 * Optional caller-asserted attributes that must match the token's bound
 * attributes when the token carries them. Used to bind a short-lived OIDC
 * token to the commit it was minted from so it cannot be reused on a
 * different commit.
 */
export type AuthAttributes = {
  sha?: string | null | undefined;
};

/**
 * Validate that any attribute the token is bound to matches the caller's
 * asserted attribute. No-op when either side is absent.
 */
export function assertAuthAttributes(
  auth: AuthSessionPayload | AuthPATPayload | AuthProjectPayload,
  attributes: AuthAttributes | undefined,
): void {
  if (!attributes) {
    return;
  }
  if (auth.type !== "project") {
    return;
  }
  if (attributes.sha && auth.sha && auth.sha !== attributes.sha) {
    throw boom(
      401,
      "Token is bound to a different commit than the one provided.",
    );
  }
}

export function assertProjectAccess(
  auth: AuthPATPayload | AuthProjectPayload,
  params: {
    projectId: string | null;
    account: { slug: string } | { id: string };
  },
) {
  switch (auth.type) {
    case "project": {
      if (auth.project.id !== params.projectId) {
        throw boom(401);
      }
      break;
    }
    case "pat": {
      // PAT scopes are stored as accounts, but callers may identify the
      // authorized account either with its public slug or with an internal
      // identifier field that is already slug-shaped.
      if (
        !auth.scope.some((account) => {
          if ("slug" in params.account) {
            return account.slug === params.account.slug;
          }
          if ("id" in params.account) {
            return account.slug === params.account.id;
          }
          return false;
        })
      ) {
        throw boom(401);
      }
      break;
    }
  }
}

export async function getAuthPayloadFromExpressReq(
  request: Request,
  attributes?: AuthAttributes,
) {
  const authHeader = getAuthHeaderFromExpressReq(request);
  const bearer = parseBearerFromHeader(authHeader);
  const auth = UserAccessToken.isValidUserAccessToken(bearer)
    ? await getAuthPayloadFromUserAccessToken(bearer)
    : await getAuthProjectPayloadFromBearerToken(bearer);
  assertAuthAttributes(auth, attributes);
  return auth;
}

export async function getProjectForAuth(
  authPromise: Promise<AuthPATPayload | AuthProjectPayload>,
  params: {
    owner: string;
    project: string;
  },
) {
  // Authenticate and load the routed project in parallel, then authorize the
  // resolved account/project pair before deciding whether this route is a 401
  // or a genuine 404. Pass `req.ctx.auth()` so both run concurrently.
  const [auth, project] = await Promise.all([
    authPromise,
    Project.query()
      .joinRelated("account")
      .where("account.slug", params.owner)
      .where("projects.name", params.project)
      .first(),
  ]);

  assertProjectAccess(auth, {
    projectId: project?.id ?? null,
    account: { slug: params.owner },
  });

  if (!project) {
    throw boom(404, "Not found");
  }

  return project;
}
