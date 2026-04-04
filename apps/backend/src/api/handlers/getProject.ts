import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getProjectFromReqAndParams } from "../auth/project";
import {
  ProjectName,
  ProjectOwner,
  ProjectSchema,
  serializeProject,
} from "../schema/primitives/project";
import {
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const getProjectOperation = {
  operationId: "getProject",
  requestParams: {
    path: z.object({
      owner: ProjectOwner,
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
