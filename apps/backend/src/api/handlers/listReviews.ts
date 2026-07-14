import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { BuildReview } from "@/database/models";

import { assertBuildPermission, loadBuildForUserAuth } from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import {
  BuildReviewSchema,
  serializeBuildReviews,
} from "../schema/primitives/buildReview";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const listReviewsOperation = {
  operationId: "listReviews",
  summary: "List the reviews submitted on a build",
  description: "List the reviews submitted on a build, with pagination.",
  tags: ["Reviews"],
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
  },
  responses: {
    "200": {
      description: "Build reviews",
      content: {
        "application/json": {
          schema: z.array(BuildReviewSchema),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listReviews: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/builds/{buildNumber}/reviews",
    async (req, res) => {
      const { auth, build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        req.ctx.params,
      );

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "view",
        message: "You do not have permission to view this build",
      });

      // Submitted reviews are visible to everyone with access; pending reviews
      // are drafts visible only to their author.
      const reviews = await BuildReview.query()
        .where("buildId", build.id)
        .where((qb) =>
          qb.whereNot("state", "pending").orWhere("userId", auth.user.id),
        )
        .orderBy("createdAt", "asc");

      res.send(await serializeBuildReviews(reviews));
    },
  );
};
