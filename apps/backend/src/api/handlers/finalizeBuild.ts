import { invariant } from "@argos/util/invariant";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { finalizeBuild as finalizeBuildService } from "@/build/finalizeBuild.js";
import { job as buildJob } from "@/build/index.js";
import { Build } from "@/database/models/index.js";
import { transaction } from "@/database/transaction.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { BuildSchema, serializeBuilds } from "../schema/primitives/build.js";
import {
  conflict,
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error.js";
import { z } from "../schema/util/zod.js";
import { CreateAPIHandler } from "../util.js";

export const finalizeBuildOperation = {
  operationId: "finalizeBuild",
  requestParams: {
    path: z.object({
      buildId: BuildSchema.shape.id,
    }),
  },
  responses: {
    "200": {
      description: "Result of build finalization",
      content: {
        "application/json": {
          schema: z.object({ build: BuildSchema }).strict(),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "409": conflict,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const finalizeBuild: CreateAPIHandler = ({ post }) => {
  return post("/builds/{buildId}/finalize", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const buildId = req.params["buildId"];

    const build = await Build.query()
      .findById(buildId)
      .withGraphFetched("compareScreenshotBucket");

    if (!build) {
      throw boom(404, "Build not found");
    }

    if (!build.compareScreenshotBucket) {
      throw boom(500, "Could not find compareScreenshotBucket for build");
    }

    if (build.compareScreenshotBucket.complete) {
      throw boom(409, "Build is already finalized");
    }

    if (build.projectId !== req.authProject!.id) {
      throw boom(403, "Build does not belong to project");
    }

    if (build.totalBatch !== null) {
      throw boom(
        409,
        "Cannot finalize a build that expects a total of batches (parallel.total)",
      );
    }

    await transaction(async (trx) => {
      await Promise.all([
        finalizeBuildService({ build, trx }),
        // If the build was marked as partial, then it was obviously an error, we unmark it.
        build.partial
          ? Build.query(trx).where("id", build.id).patch({ partial: false })
          : null,
      ]);
    });

    await buildJob.push(build.id);

    const [buildResponse] = await serializeBuilds([build]);
    invariant(buildResponse);

    res.send({ build: buildResponse });
  });
};
