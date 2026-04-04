import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { job as buildJob } from "@/build";
import { finalizeBuild as finalizeBuildService } from "@/build/finalizeBuild";
import { Build } from "@/database/models";
import { transaction } from "@/database/transaction";

import { getAuthProjectPayloadFromExpressReq } from "../auth/project";
import { BuildSchema, serializeBuilds } from "../schema/primitives/build";
import {
  conflict,
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const RequestBodySchema = z.object({ parallelNonce: z.string().min(1) });

const ResponseSchema = z.object({ builds: z.array(BuildSchema) });

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
          schema: ResponseSchema,
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
  return post("/builds/finalize", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);

    const { parallelNonce } = req.body;

    const builds = await Build.query()
      .withGraphFetched("compareScreenshotBucket")
      .where("builds.projectId", auth.project.id)
      .where("builds.externalId", parallelNonce)
      .where("builds.totalBatch", -1);

    const finalized = await transaction(async (trx) => {
      return Promise.all(
        builds.map(async (build) => {
          invariant(build.compareScreenshotBucket);
          const willFinalize = !build.compareScreenshotBucket.complete;

          await Promise.all([
            willFinalize ? finalizeBuildService({ build, trx }) : null,
            // If the build was marked as partial, then it was obviously an error, we unmark it.
            build.partial
              ? Build.query(trx).where("id", build.id).patch({ partial: false })
              : null,
          ]);

          return willFinalize;
        }),
      );
    });

    await Promise.all(
      builds.map(async (build, index) => {
        if (finalized[index]) {
          await buildJob.push(build.id);
        }
      }),
    );

    const buildResponses = await serializeBuilds(builds);
    res.send({ builds: buildResponses });
  });
};
