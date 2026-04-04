import type { Request } from "express";

import {
  getAuthHeaderFromExpressReq,
  parseBearerFromHeader,
} from "@/auth/auth-header";
import type { AuthPATPayload, AuthProjectPayload } from "@/auth/payload";
import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import { getAuthPayloadFromUserAccessToken } from "@/auth/user-access-token";
import { Project, UserAccessToken } from "@/database/models";
import { boom } from "@/util/error";

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

export async function getAuthPayloadFromExpressReq(request: Request) {
  const authHeader = getAuthHeaderFromExpressReq(request);
  const bearer = parseBearerFromHeader(authHeader);
  if (UserAccessToken.isValidUserAccessToken(bearer)) {
    return getAuthPayloadFromUserAccessToken(bearer);
  }
  return getAuthProjectPayloadFromBearerToken(bearer);
}

export async function getAuthProjectPayloadFromExpressReq(request: Request) {
  const authHeader = getAuthHeaderFromExpressReq(request);
  const bearer = parseBearerFromHeader(authHeader);
  return getAuthProjectPayloadFromBearerToken(bearer);
}

export async function getProjectFromReqAndParams(
  request: Request,
  params: {
    owner: string;
    project: string;
  },
) {
  // Load the auth payload and the routed project together, then authorize the
  // resolved account/project pair before deciding whether this route is a 401
  // or a genuine 404.
  const [auth, project] = await Promise.all([
    getAuthPayloadFromExpressReq(request),
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
