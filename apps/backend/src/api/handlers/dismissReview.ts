import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { dismissBuildReview } from "@/build/dismissBuildReview";
import { BuildReview } from "@/database/models";
import { boom } from "@/util/error";

import { assertBuildPermission, getPatAuthAndBuild } from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import {
  BuildReviewSchema,
  serializeBuildReview,
} from "../schema/primitives/buildReview";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const dismissReviewOperation = {
  operationId: "dismissReview",
  summary: "Dismiss a submitted review on a build",
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
      reviewId: z.string().meta({ description: "The ID of the review" }),
    }),
  },
  responses: {
    "200": {
      description: "Review dismissed successfully — returns the review",
      content: {
        "application/json": {
          schema: BuildReviewSchema,
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

export const dismissReview: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/reviews/{reviewId}/dismiss",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await getPatAuthAndBuild(req, params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review_dismiss",
        message: "You do not have permission to dismiss this review",
      });

      const review = await BuildReview.query().findById(params.reviewId);
      if (!review || review.buildId !== build.id) {
        throw boom(404, "Review not found");
      }

      if (review.state === "pending") {
        throw boom(400, "You cannot dismiss a pending review");
      }

      if (review.dismissedAt) {
        throw boom(400, "Review already dismissed");
      }

      const dismissedReview = await dismissBuildReview({
        review,
        build,
        dismissedById: auth.user.id,
      });

      res.send(await serializeBuildReview(dismissedReview));
    },
  );
};
