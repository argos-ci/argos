import { ZodOpenApiOperationObject } from "zod-openapi";

import { getAuthProjectPayloadFromExpressReq } from "../auth/project";
import { ProjectSchema, serializeProject } from "../schema/primitives/project";
import { serverError, unauthorized } from "../schema/util/error";
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
  responses,
} satisfies ZodOpenApiOperationObject;

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  get("/project", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);
    res.send(await serializeProject(auth.project));
  });
};
