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
import { notFound, serverError, unauthorized } from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const getBuildOperation = {
  operationId: "getBuild",
  requestParams: {
    path: z.object({
      buildId: BuildIdSchema,
    }),
  },
  responses: {
    "200": {
      description: "Build",
      content: {
        "application/json": {
          schema: BuildSchema,
        },
      },
    },
    "404": notFound,
    "401": unauthorized,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getBuild: CreateAPIHandler = ({ get }) => {
  return get("/builds/{buildId}", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }
    const { params } = req.ctx;

    const build = await Build.query().findOne({
      id: params.buildId,
      projectId: req.authProject.id,
    });

    if (!build) {
      throw boom(404, "Not found");
    }

    res.send(await serializeBuild(build));
  });
};
