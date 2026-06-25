import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getProjectFromReqAndParams } from "../auth/project";
import {
  AccountSlug,
  ProjectName,
  ProjectSchema,
  serializeProject,
} from "../schema/primitives/project";
import {
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenAuth } from "../schema/util/security";
import { CreateAPIHandler } from "../util";

export const getProjectOperation = {
  operationId: "getProject",
  summary: "Get a project",
  description:
    "Retrieve a project by its owner (account slug) and project name.",
  tags: ["Projects"],
  security: anyTokenAuth,
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
  },
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
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getProject: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}", async (req, res) => {
    const project = await getProjectFromReqAndParams(req, req.ctx.params);
    res.send(await serializeProject(project));
  });
};
