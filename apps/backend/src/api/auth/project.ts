import type { Request } from "express";

import {
  getAuthHeaderFromExpressReq,
  parseBearerFromHeader,
} from "@/auth/auth-header";
import {
  getAcceptedOAuthResources,
  getAuthPayloadFromOAuthAccessToken,
  getSkipUsageTracking,
} from "@/auth/oauth-access-token";
import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
  AuthSessionPayload,
} from "@/auth/payload";
import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import { getAuthPayloadFromUserAccessToken } from "@/auth/user-access-token";
import {
  OAuthAccessToken,
  Project,
  UserAccessToken,
  type Account,
  type ProjectPermission,
} from "@/database/models";
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
  auth:
    | AuthSessionPayload
    | AuthPATPayload
    | AuthProjectPayload
    | AuthOAuthPayload,
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
  auth: AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
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
    // PAT and OAuth both carry an account scope; the account-membership check is
    // identical for both.
    case "pat":
    case "oauth": {
      // PAT/OAuth scopes are stored as accounts, but callers may identify the
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
  const trackUsage = !getSkipUsageTracking(request);
  const auth = OAuthAccessToken.isOAuthAccessToken(bearer)
    ? await getAuthPayloadFromOAuthAccessToken(bearer, {
        acceptedResources: getAcceptedOAuthResources(request),
        trackUsage,
      })
    : UserAccessToken.isValidUserAccessToken(bearer)
      ? await getAuthPayloadFromUserAccessToken(bearer, { trackUsage })
      : await getAuthProjectPayloadFromBearerToken(bearer);
  assertAuthAttributes(auth, attributes);
  return auth;
}

/**
 * What a route needs on the project it resolves: the permission the user must
 * hold, and the message of the 403 they get without it.
 *
 * The project loaders take one, or `null` when the route authorizes the user
 * itself — usually through a service shared with the GraphQL API, which
 * checks a stronger permission than `view` on its own.
 */
export type ProjectAccess = {
  permission: ProjectPermission;
  message: string;
  /**
   * Grant only what membership does, without a public project's `view`
   * fallback — for what stays team-only in a public project, such as media.
   */
  membership?: true;
};

export const VIEW_PROJECT_ACCESS: ProjectAccess = {
  permission: "view",
  message: "You do not have permission to view this project",
};

export const ADMIN_PROJECT_ACCESS: ProjectAccess = {
  permission: "admin",
  message: "You are not an administrator of this project.",
};

/**
 * Assert the caller holds a permission on a project {@link assertProjectAccess}
 * let it reach, throwing a 403 otherwise.
 *
 * A project token is bound to that one project, so reaching it is enough. A
 * user's token is scoped to accounts, not projects: it reaches every project of
 * a team they belong to, private ones a contributor was never given included,
 * so their own project permissions decide.
 */
export async function assertProjectPermission(
  auth: AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
  project: Project,
  access: ProjectAccess | null,
): Promise<void> {
  if (!access || auth.type === "project") {
    return;
  }
  const permissions = access.membership
    ? await project.$getMembershipPermissions(auth.user)
    : await project.$getPermissions(auth.user);
  if (!permissions.includes(access.permission)) {
    throw boom(403, access.message);
  }
}

export async function getProjectForAuth(
  authPromise: Promise<AuthPATPayload | AuthProjectPayload | AuthOAuthPayload>,
  params: {
    owner: string;
    project: string;
  },
  access: ProjectAccess | null,
) {
  // Authenticate and load the routed project in parallel, then authorize the
  // resolved account/project pair before deciding whether this route is a 401
  // or a genuine 404. Pass `req.ctx.auth()` so both run concurrently.
  const [auth, project] = await Promise.all([
    authPromise,
    Project.queryNotDeleted()
      // Joined into the graph, not just filtered on: the permission check
      // reads the account and would otherwise fetch it again.
      .withGraphJoined("account")
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

  await assertProjectPermission(auth, project, access);

  return project;
}

/**
 * Resolve the account identified by `slug` for the authenticated principal, or
 * throw. Used by account-level actions (such as creating a project) that are
 * not scoped to an existing project.
 *
 * A personal access token carries an explicit account scope, and that scope is
 * the authorization boundary: an account the token is not scoped to is
 * indistinguishable from one that does not exist — both throw `401` — so the
 * existence of accounts outside the token's scope is never disclosed. Project
 * tokens are bound to a single project and cannot perform account-level
 * actions, so they are always rejected.
 *
 * This only establishes that the token may act on the account; the caller must
 * still check the user's role on it (e.g. `account.$getPermissions`).
 */
export function getAccountForAuth(
  auth: AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
  params: { slug: string },
): Account {
  if (auth.type !== "pat" && auth.type !== "oauth") {
    throw boom(401);
  }
  const account = auth.scope.find((account) => account.slug === params.slug);
  if (!account) {
    throw boom(
      401,
      "You do not have access to this account. Check that your personal access token is scoped to it.",
    );
  }
  return account;
}
