import { ZodOpenApiOperationObject } from "zod-openapi";

import { GithubRepository } from "@/database/models/GithubRepository";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { ProjectSchema } from "../schema/primitives/project";
import { serverError, unauthorized } from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const getAuthProjectOperation = {
  operationId: "getAuthProject",
  responses: {
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
  },
} satisfies ZodOpenApiOperationObject;

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  return get("/project", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    await req.authProject.$fetchGraph(
      "[githubRepository.repoInstallations.installation,gitlabProject]",
    );

    const defaultBaseBranch = await req.authProject.$getDefaultBaseBranch();

    const installation = req.authProject.githubRepository
      ? GithubRepository.pickBestInstallation(req.authProject.githubRepository)
      : null;

    // We have remote content access if the installation is the main app
    const hasRemoteContentAccess = installation?.app === "main";

    res.send({
      id: req.authProject.id,
      defaultBaseBranch,
      hasRemoteContentAccess,
    });
  });
};
