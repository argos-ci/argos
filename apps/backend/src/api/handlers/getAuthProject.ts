import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { GithubRepository } from "@/database/models/GithubRepository";
import { Project } from "@/database/models/Project";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { ProjectSchema } from "../schema/primitives/project";
import {
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";
import {
  getAuthorizedProjectFromRequest,
  getAuthorizedProjectFromRequestResponses,
} from "./projectAccess";

const ProjectPathParamsSchema = z.object({
  owner: z.string().min(1),
  project: z.string().min(1),
});

const responses = {
  ...getAuthorizedProjectFromRequestResponses,
  "200": {
    description: "Project",
    content: {
      "application/json": {
        schema: ProjectSchema,
      },
    },
  },
  "401": unauthorized,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const getAuthProjectOperation = {
  operationId: "getAuthProject",
  responses,
} satisfies ZodOpenApiOperationObject;

export const getProjectOperation = {
  operationId: "getProject",
  requestParams: {
    path: ProjectPathParamsSchema,
  },
  responses: { ...responses, "403": forbidden, "404": notFound },
} satisfies ZodOpenApiOperationObject;

async function serializeProject(project: Project) {
  await project.$fetchGraph(
    "[githubRepository.repoInstallations.installation,gitlabProject]",
  );

  const defaultBaseBranch = await project.$getDefaultBaseBranch();

  const installation = project.githubRepository
    ? GithubRepository.pickBestInstallation(project.githubRepository)
    : null;

  // We have remote content access if the installation is the main app
  const hasRemoteContentAccess = installation?.app === "main";

  return {
    id: project.id,
    defaultBaseBranch,
    hasRemoteContentAccess,
  };
}

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  get("/project", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    res.send(await serializeProject(req.authProject));
  });

  get("/projects/{owner}/{project}", repoAuth, async (req, res) => {
    const { owner, project } = req.ctx.params;
    const authorizedProject = await getAuthorizedProjectFromRequest({
      request: req,
      owner,
      projectName: project,
    });

    res.send(await serializeProject(authorizedProject));
  });
};
