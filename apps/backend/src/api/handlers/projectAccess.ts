import type { Request } from "express";

import { Project } from "@/database/models";
import { boom } from "@/util/error";

import { forbidden, notFound, unauthorized } from "../schema/util/error";

export const assertProjectAccessResponses = {
  "401": unauthorized,
  "403": forbidden,
  "404": notFound,
};

export async function assertProjectAccess(args: {
  request: Request;
  project: Project;
}) {
  const { request, project } = args;

  // Project token auth: the token must match the same project.
  if (request.authProject) {
    if (request.authProject.id !== project.id) {
      throw boom(404, "Not found");
    }
    return request.authProject;
  }

  // User/PAT auth: must be authenticated and authorized on the project.
  if (!request.auth) {
    throw boom(401, "Unauthorized");
  }

  const permissions = await Project.getPermissions(project, request.auth.user);
  if (!permissions.includes("view")) {
    throw boom(403, "Forbidden");
  }

  // If PAT has a scope, the project account must be included in it.
  if (
    request.auth.scope &&
    !request.auth.scope.some((account) => account.id === project.accountId)
  ) {
    throw boom(403, "Forbidden");
  }

  return project;
}

export const getAuthorizedProjectFromRequestResponses = {
  ...assertProjectAccessResponses,
  "404": notFound,
};

export async function getAuthorizedProjectFromRequest(args: {
  request: Request;
  owner: string;
  projectName: string;
}) {
  const { request, owner, projectName } = args;

  const project = await Project.query()
    .joinRelated("account")
    .where("account.slug", owner)
    .where("projects.name", projectName)
    .first();

  if (!project) {
    throw boom(404, "Not found");
  }

  return assertProjectAccess({ request, project });
}
