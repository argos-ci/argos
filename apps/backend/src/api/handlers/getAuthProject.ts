import { ZodOpenApiOperationObject } from "zod-openapi";

import { GithubRepository } from "@/database/models/GithubRepository.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { ProjectSchema } from "../schema/primitives/project.js";
import { serverError, unauthorized } from "../schema/util/error.js";
import { CreateAPIHandler } from "../util.js";

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

    const referenceBranch = await req.authProject.$getReferenceBranch();

    const installation = req.authProject.githubRepository
      ? GithubRepository.pickBestInstallation(req.authProject.githubRepository)
      : null;

    // We have remote content access if the installation is the main app
    const hasRemoteContentAccess = installation?.app === "main";

    res.send({
      id: req.authProject.id,
      defaultBaseBranch: referenceBranch,
      hasRemoteContentAccess,
    });
  });
};
