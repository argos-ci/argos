import { ZodOpenApiOperationObject } from "zod-openapi";

import { ProjectSchema, serializeProject } from "../schema/primitives/project";
import { serverError, unauthorized } from "../schema/util/error";
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
  "401": unauthorized,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const getAuthProjectOperation = {
  operationId: "getAuthProject",
  summary: "Get the current project",
  description:
    "Retrieve the project associated with the project token used to authenticate the request.",
  tags: ["Projects"],
  security: projectTokenAuth,
  responses,
} satisfies ZodOpenApiOperationObject;

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  get("/project", async (req, res) => {
    const auth = req.ctx.auth;
    res.send(await serializeProject(auth.project));
  });
};
