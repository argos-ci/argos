import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getEligibleBaselineBuildFromCommits } from "@/build/strategy/strategies/ci/query";

import { BuildSchema, serializeBuild } from "../schema/primitives/build";
import { Sha1HashSchema } from "../schema/primitives/sha";
import {
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { projectTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const RequestBodySchema = z.object({
  commits: z.array(Sha1HashSchema).min(1).meta({
    description:
      "The commits to look for an eligible baseline, ordered from the closest to the furthest ancestor. The first commit with an eligible baseline wins.",
  }),
  name: z
    .string()
    .min(1)
    .default("default")
    .meta({ description: "The name of the build to find a baseline for." }),
  mode: z
    .enum(["ci", "monitoring"])
    .default("ci")
    .meta({ description: "The mode of the build to find a baseline for." }),
});

const ResponseSchema = z.object({
  baseline: BuildSchema.nullable().meta({
    description:
      "The eligible baseline build found among the commits, or null when none is found.",
  }),
});

export const findBaselineOperation = {
  operationId: "findBaseline",
  summary: "Find an eligible baseline from a list of commits",
  description:
    "Find the build eligible to be used as a baseline among a list of commits. Useful when no Git provider is connected: the CLI can send the candidate ancestor commits and let Argos pick the closest one that has an eligible (complete, valid, approved and not rejected) baseline build.",
  tags: ["Builds"],
  security: projectTokenAuth,
  requestBody: {
    content: {
      "application/json": {
        schema: RequestBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The eligible baseline build, or null when none is found",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const findBaseline: CreateAPIHandler = ({ post }) => {
  post("/baseline", async (req, res) => {
    const auth = await req.ctx.auth();
    const { commits, name, mode } = req.ctx.body;

    const build = await getEligibleBaselineBuildFromCommits({
      projectId: auth.project.id,
      name,
      mode,
      shas: commits,
    });

    res.send({
      baseline: build ? await serializeBuild(build) : null,
    });
  });
};
