import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { createBuildReview, ReviewState } from "@/build/createBuildReview";
import { Build } from "@/database/models/Build";
import { boom } from "@/util/error";

import {
  assertProjectAccess,
  getAuthPayloadFromExpressReq,
} from "../auth/project";
import { BuildNumber } from "../schema/primitives/build";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const ReviewConclusionSchema = z.enum(["APPROVE", "REQUEST_CHANGES"]);

const CreateReviewBodySchema = z.object({
  conclusion: ReviewConclusionSchema.meta({
    description:
      'Overall review conclusion for the build: "APPROVE" or "REQUEST_CHANGES"',
  }),
  snapshots: z
    .array(
      z.object({
        id: z
          .string()
          .meta({ description: "The ID of the snapshot to review" }),
        conclusion: ReviewConclusionSchema.meta({
          description:
            'Review conclusion for this individual snapshot: "APPROVE" or "REQUEST_CHANGES"',
        }),
      }),
    )
    .optional()
    .default([])
    .meta({
      description:
        "Optional per-snapshot review decisions. When omitted, only the build-level review is recorded.",
    }),
});

const BuildReviewSchema = z
  .object({
    id: z.string(),
    state: z.enum(["approved", "rejected"]),
  })
  .meta({ description: "Build review" });

export const createReviewOperation = {
  operationId: "createReview",
  summary: "Create a review on a specified build",
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
        schema: CreateReviewBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Review submitted successfully — returns the review",
      content: {
        "application/json": {
          schema: BuildReviewSchema,
        },
      },
    },
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

const getBuildReviewState = (
  conclusion: z.infer<typeof ReviewConclusionSchema>,
): ReviewState => {
  switch (conclusion) {
    case "APPROVE":
      return "approved";

    case "REQUEST_CHANGES":
      return "rejected";

    default:
      assertNever(conclusion);
  }
};

const getScreenshotReviewState = (
  conclusion: z.infer<typeof ReviewConclusionSchema>,
): ReviewState => {
  switch (conclusion) {
    case "APPROVE":
      return "approved";

    case "REQUEST_CHANGES":
      return "rejected";

    default:
      assertNever(conclusion);
  }
};

export const createReview: CreateAPIHandler = ({ post }) => {
  return post(
    "/projects/{owner}/{project}/builds/{buildNumber}/reviews",
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
          "Creating a review requires a personal access token. See https://argos-ci.com/docs for details.",
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

      const buildReview = await createBuildReview({
        build,
        userId: auth.user.id,
        state: getBuildReviewState(body.conclusion),
        snapshotReviews: body.snapshots.map((snapshotReview) => ({
          screenshotDiffId: snapshotReview.id,
          state: getScreenshotReviewState(snapshotReview.conclusion),
        })),
      });

      res.send(buildReview);
    },
  );
};
