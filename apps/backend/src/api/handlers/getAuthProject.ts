import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { resolveAuthProject } from "../auth/project";
import {
  ProjectSchema,
  serializeProject,
  TokenProjectPath,
} from "../schema/primitives/project";
import {
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { projectTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const responses = {
  "200": {
    description: "Project",
    content: {
      "application/json": {
        schema: ProjectSchema,
      },
    },
  },
  "400": invalidParameters,
  "401": unauthorized,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const getAuthProjectOperation = {
  operationId: "getAuthProject",
  summary: "Get the current project",
  description:
    "Retrieve the project associated with the project token used to authenticate the request. Any project token can read it, whatever its permissions.",
  tags: ["Projects"],
  security: projectTokenAuth([]),
  requestParams: {
    query: z.object({ project: TokenProjectPath }),
  },
  responses,
} satisfies ZodOpenApiOperationObject;

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  get("/project", async (req, res) => {
    const auth = await req.ctx.auth();
    const project = await resolveAuthProject(auth, req.ctx.query.project);
    res.send(await serializeProject(project));
  });
};
