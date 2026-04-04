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
    owner: string;
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
      if (!auth.scope.some((account) => account.slug === params.owner)) {
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
    owner: params.owner,
  });

  if (!project) {
    throw boom(404, "Not found");
  }

  return project;
}
