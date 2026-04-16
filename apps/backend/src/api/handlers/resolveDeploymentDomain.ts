import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import config from "@/config";
import { Deployment } from "@/database/models/Deployment";
import { boom } from "@/util/error";

import { invalidParameters, notFound, serverError } from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const ResponseSchema = z.object({
  deploymentId: z.string(),
});

const CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

function getAliasCandidates(domain: string): string[] {
  const value = domain.trim().toLowerCase();
  if (!value) {
    return [];
  }

  let hostname = value;
  if (value.includes("://")) {
    try {
      hostname = new URL(value).hostname.toLowerCase();
    } catch {
      return [];
    }
  }

  const candidates = new Set<string>([hostname]);
  const baseDomain = config.get("deployments.baseDomain").toLowerCase();
  const suffix = `.${baseDomain}`;
  if (hostname.endsWith(suffix)) {
    const alias = hostname.slice(0, -suffix.length);
    if (alias) {
      candidates.add(alias);
    }
  }

  return Array.from(candidates);
}

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
    const aliases = getAliasCandidates(domain);

    if (aliases.length === 0) {
      throw boom(400, "Invalid deployment domain");
    }

    const deployment = await Deployment.query()
      .select("deployments.id")
      .leftJoin(
        "deployment_aliases",
        "deployment_aliases.deploymentId",
        "deployments.id",
      )
      .where((query) => {
        query
          .whereIn("deployment_aliases.alias", aliases)
          .orWhereIn("deployments.slug", aliases);
      })
      .first();

    if (!deployment) {
      throw boom(404, "Deployment domain not found");
    }

    res.set("Cache-Control", CACHE_CONTROL);
    res.set("CDN-Cache-Control", CACHE_CONTROL);
    res.send({
      deploymentId: deployment.id,
    });
  });
};
