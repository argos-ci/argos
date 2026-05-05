import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  getDeploymentAliasCandidates,
  resolveDeploymentByDomain,
} from "@/deployment/resolve";
import { boom } from "@/util/error";

import { invalidParameters, notFound, serverError } from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const ResponseSchema = z.object({
  deploymentId: z.string(),
  projectId: z.string(),
  environment: z.enum(["preview", "production"]),
  visibility: z.enum(["private", "public"]),
});

const CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

export const resolveDeploymentDomainOperation = {
  operationId: "resolveDeploymentDomain",
  security: [],
  requestParams: {
    path: z.object({
      domain: z.string().meta({ description: "A deployment domain or URL" }),
    }),
  },
  responses: {
    "200": {
      description: "Deployment domain resolved",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    "400": invalidParameters,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const resolveDeploymentDomain: CreateAPIHandler = ({ get }) => {
  return get("/deployments/resolve/{domain}", async (req, res) => {
    const { domain } = req.ctx.params;

    if (getDeploymentAliasCandidates(domain).length === 0) {
      throw boom(400, "Invalid deployment domain");
    }

    const deployment = await resolveDeploymentByDomain(domain);

    res.set("Cache-Control", CACHE_CONTROL);

    if (!deployment) {
      throw boom(404, "Deployment domain not found");
    }

    res.send({
      deploymentId: deployment.id,
      projectId: deployment.projectId,
      environment: deployment.environment,
      visibility:
        deployment.environment === "production" && deployment.type === "domain"
          ? "public"
          : "private",
    });
  });
};
