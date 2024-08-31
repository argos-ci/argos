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

const RequestBodySchema = z
  .object({ parallelNonce: z.string().min(1) })
  .strict();

export const finalizeBuildsOperation = {
  operationId: "finalizeBuilds",
  requestBody: {
    content: {
      "application/json": {
        schema: RequestBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Result of build finalization",
      content: {
        "application/json": {
          schema: z.object({ builds: z.array(BuildSchema) }).strict(),
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

export const finalizeBuilds: CreateAPIHandler = ({ post }) => {
  return post("/builds/finalize", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const { parallelNonce } = req.body;

    const builds = await Build.query()
      .withGraphFetched("compareScreenshotBucket")
      .where("builds.projectId", req.authProject.id)
      .where("externalId", parallelNonce)
      .where("totalBatch", -1);

    if (builds.length === 0) {
      throw boom(404, "No build found with the given parallel.nonce");
    }

    builds.forEach((build) => {
      if (!build.compareScreenshotBucket) {
        throw boom(500, "Could not find compareScreenshotBucket for build");
      }

      if (build.compareScreenshotBucket.complete) {
        throw boom(409, "Build is already finalized");
      }
    });

    await transaction(async (trx) => {
      await Promise.all(
        builds.map(async (build) => {
          await Promise.all([
            finalizeBuildService({ build, trx }),
            // If the build was marked as partial, then it was obviously an error, we unmark it.
            build.partial
              ? Build.query(trx).where("id", build.id).patch({ partial: false })
              : null,
          ]);
        }),
      );
    });

    await Promise.all(builds.map((build) => buildJob.push(build.id)));

    const buildResponses = await serializeBuilds(builds);
    res.send({ builds: buildResponses });
  });
};
