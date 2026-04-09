import z from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models";
import { boom } from "@/util/error";

import {
  assertProjectAccess,
  getAuthPayloadFromExpressReq,
} from "../auth/project";
import {
  BuildNumber,
  BuildSchema,
  serializeBuild,
} from "../schema/primitives/build";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const getBuildOperation = {
  operationId: "getBuild",
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
  },
  responses: {
    "200": {
      description: "Build",
      content: { "application/json": { schema: BuildSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "403": forbidden,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getBuild: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/builds/{buildNumber}", async (req, res) => {
    const { params } = req.ctx;
    const [auth, build] = await Promise.all([
      getAuthPayloadFromExpressReq(req),
      Build.query()
        .joinRelated("project.account")
        .where("project:account.slug", params.owner)
        .where("project.name", params.project)
        .where("number", params.buildNumber)
        .first(),
    ]);

    assertProjectAccess(auth, {
      projectId: build?.projectId ?? null,
      account: { slug: params.owner },
    });

    if (!build) {
      throw boom(404, "Not found");
    }

    res.send(await serializeBuild(build));
  });
};
