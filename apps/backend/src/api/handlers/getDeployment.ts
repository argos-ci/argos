import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Deployment } from "@/database/models/Deployment";
import { boom } from "@/util/error";

import { getAuthProjectPayloadFromExpressReq } from "../auth/project";
import {
  DeploymentSchema,
  serializeDeployment,
} from "../schema/primitives/deployment";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const getDeploymentOperation = {
  operationId: "getDeployment",
  requestParams: {
    path: z.object({
      deploymentId: z.string().meta({ description: "The deployment ID" }),
    }),
  },
  responses: {
    "200": {
      description: "Deployment details",
      content: {
        "application/json": {
          schema: DeploymentSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getDeployment: CreateAPIHandler = ({ get }) => {
  return get("/deployments/{deploymentId}", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);
    const { deploymentId } = req.ctx.params;

    const deployment = await Deployment.query().findById(deploymentId);
    if (!deployment) {
      throw boom(404, "Deployment not found");
    }

    if (deployment.projectId !== auth.project.id) {
      throw boom(401, "Unauthorized");
    }

    res.send(serializeDeployment(deployment));
  });
};
