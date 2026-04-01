import { invariant } from "@argos/util/invariant";
import z from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import {
  BuildIdSchema,
  BuildSchema,
  serializeBuild,
} from "../schema/primitives/build";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";
import {
  assertProjectAccess,
  assertProjectAccessResponses,
} from "./projectAccess";

export const getBuildOperation = {
  operationId: "getBuild",
  requestParams: {
    path: z.object({
      buildId: BuildIdSchema,
    }),
  },
  responses: {
    ...assertProjectAccessResponses,
    "200": {
      description: "Build",
      content: {
        "application/json": {
          schema: BuildSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getBuild: CreateAPIHandler = ({ get }) => {
  return get("/builds/{buildId}", repoAuth, async (req, res) => {
    const { buildId } = req.ctx.params;

    const build = await Build.query()
      .findById(buildId)
      .withGraphFetched("project");

    if (!build) {
      throw boom(404, "Not found");
    }

    invariant(build.project, "Build project is missing");
    await assertProjectAccess({ request: req, project: build.project });

    res.send(await serializeBuild(build));
  });
};
