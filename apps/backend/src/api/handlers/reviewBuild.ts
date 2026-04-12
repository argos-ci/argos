import { AutomationEvents } from "@argos/schemas/automation-event";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { triggerAndRunAutomation } from "@/automation";
import { pushBuildNotification } from "@/build-notification/notifications";
import { Build } from "@/database/models/Build";
import { BuildReview } from "@/database/models/BuildReview";
import { ScreenshotDiffReview } from "@/database/models/ScreenshotDiffReview";
import { transaction } from "@/database/transaction";
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
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const ReviewStateSchema = z.enum(["approved", "rejected"]);

const ReviewBuildBodySchema = z.object({
  state: ReviewStateSchema.meta({
    description:
      'Overall review decision for the build: "approved" or "rejected"',
  }),
  screenshotDiffReviews: z
    .array(
      z.object({
        id: z.string().meta({
          description: "The ID of the snapshot diff to review",
        }),
        state: ReviewStateSchema.meta({
          description:
            'Decision for this individual diff: "approved" or "rejected"',
        }),
      }),
    )
    .optional()
    .default([])
    .meta({
      description:
        "Optional per-diff review decisions. When omitted, only the build-level decision is recorded.",
    }),
});

export const reviewBuildOperation = {
  operationId: "reviewBuild",
  summary: "Submit a review decision for a build",
  description:
    "Approve or reject a build. Requires a user token obtained via `argos login`. Project tokens cannot review builds.",
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ReviewBuildBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Review submitted successfully — returns the updated build",
      content: {
        "application/json": {
          schema: BuildSchema,
        },
      },
    },
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const reviewBuild: CreateAPIHandler = ({ post }) => {
  return post(
    "/projects/{owner}/{project}/builds/{buildNumber}/review",
    async (req, res) => {
      const { params, body } = req.ctx;

      const [auth, build] = await Promise.all([
        getAuthPayloadFromExpressReq(req),
        Build.query()
          .joinRelated("project.account")
          .where("project:account.slug", params.owner)
          .where("project.name", params.project)
          .where("number", params.buildNumber)
          .withGraphFetched("project.account")
          .first(),
      ]);

      if (auth.type !== "pat") {
        throw boom(
          401,
          "Reviewing a build requires user authentication. Run `argos login` first.",
        );
      }

      assertProjectAccess(auth, {
        projectId: build?.projectId ?? null,
        account: { slug: params.owner },
      });

      if (!build) {
        throw boom(404, "Not found");
      }

      invariant(build.project);

      const permissions = await build.project.$getPermissions(auth.user);

      if (!permissions.includes("review")) {
        throw boom(403, "You do not have permission to review this build");
      }

      const buildReview = await transaction(async (trx) => {
        const review = await BuildReview.query(trx).insert({
          buildId: build.id,
          userId: auth.user.id,
          state: body.state,
        });

        if (body.screenshotDiffReviews.length > 0) {
          await ScreenshotDiffReview.query(trx).insert(
            body.screenshotDiffReviews.map((diffReview) => ({
              screenshotDiffId: diffReview.id,
              buildReviewId: review.id,
              state: diffReview.state,
            })),
          );
        }

        return review;
      });

      await Promise.all([
        pushBuildNotification({
          buildId: build.id,
          type: body.state === "approved" ? "diff-accepted" : "diff-rejected",
        }),
        triggerAndRunAutomation({
          projectId: build.projectId,
          message: {
            event: AutomationEvents.BuildReviewed,
            payload: { build, buildReview },
          },
        }),
      ]);

      const updatedBuild = await Build.query()
        .findById(build.id)
        .withGraphFetched(
          "[project.account, compareScreenshotBucket, baseScreenshotBucket]",
        );

      invariant(updatedBuild, "Build not found after review");

      const serialized = await serializeBuild(updatedBuild);
      res.send(serialized);
    },
  );
};
