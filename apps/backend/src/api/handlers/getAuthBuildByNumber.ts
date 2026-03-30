import z from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { BuildSchema, serializeBuild } from "../schema/primitives/build";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const BuildNumberSchema = z
  .string()
  .transform((value) => z.coerce.number().int().min(1).parse(value))
  .meta({
    description: "The build number",
    example: 42,
    id: "BuildNumber",
  });

export const getAuthBuildByNumberOperation = {
  operationId: "getAuthBuildByNumber",
  requestParams: {
    path: z.object({
      buildNumber: BuildNumberSchema,
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
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getAuthBuildByNumber: CreateAPIHandler = ({ get }) => {
  return get("/project/builds/{buildNumber}", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }
    const { params } = req.ctx;

    const build = await Build.query().findOne({
      number: params.buildNumber,
      projectId: req.authProject.id,
    });

    if (!build) {
      throw boom(404, "Not found");
    }

    res.send(await serializeBuild(build));
  });
};
