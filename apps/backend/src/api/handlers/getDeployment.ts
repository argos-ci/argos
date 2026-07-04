import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Deployment } from "@/database/models/Deployment";
import { boom } from "@/util/error";

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
import { projectTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const getDeploymentOperation = {
  operationId: "getDeployment",
  summary: "Get a deployment",
  description: "Retrieve a single deployment by its ID.",
  tags: ["Deployments"],
  security: projectTokenAuth,
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
    const { deploymentId } = req.ctx.params;
    const [auth, deployment] = await Promise.all([
      req.ctx.auth(),
      Deployment.query().findById(deploymentId),
    ]);
    if (!deployment) {
      throw boom(404, "Deployment not found");
    }

    if (deployment.projectId !== auth.project.id) {
      throw boom(401, "Unauthorized");
    }

    res.send(serializeDeployment(deployment));
  });
};
