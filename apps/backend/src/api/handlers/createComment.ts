import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getOrCreatePendingBuildReview } from "@/build/pendingReview";
import { isReviewableBuildStatus } from "@/build/reviewableStatus";
import { resolveCommentBody } from "@/comment/body";
import { createBuildComment } from "@/comment/createBuildComment";
import { Build, BuildReview, ScreenshotDiff } from "@/database/models";
import {
  CommentAnchorSchema as StoredCommentAnchorSchema,
  type CommentAnchor,
} from "@/database/models/Comment";
import { boom } from "@/util/error";

import {
  assertBuildPermission,
  getBuildCommentThread,
  loadBuildForPatAuth,
} from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import {
  CommentAnchorSchema,
  CommentBodyInputSchema,
  CommentSchema,
  serializeComment,
} from "../schema/primitives/comment";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { personalAccessTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const CreateCommentBodySchema = z.object({
  body: CommentBodyInputSchema,
  threadId: z
    .string()
    .optional()
    .meta({ description: "Root comment ID to reply to." }),
  screenshotDiffId: z.string().optional().meta({
    description:
      "Screenshot diff to anchor the comment to. Required when anchor is set.",
  }),
  anchor: CommentAnchorSchema.optional(),
  addToReview: z.boolean().optional().meta({
    description:
      "Attach the comment to your pending review (created if needed) instead of posting it immediately. Ignored for replies, which inherit their thread's review.",
  }),
});

export const createCommentOperation = {
  operationId: "createComment",
  summary: "Post a comment (or reply) on a build",
  description:
    "Post a comment on a build. Start a new thread, reply to an existing one with `threadId`, optionally anchor the comment to a screenshot diff, or attach it to your pending review with `addToReview`.",
  tags: ["Comments"],
  security: personalAccessTokenAuth,
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
        schema: CreateCommentBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "Comment created successfully — returns the comment",
      content: {
        "application/json": {
          schema: CommentSchema,
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

/**
 * Validate a comment anchor against the model's bounds and inverted-range rules,
 * turning a failure into a clean 400. The input already has the stored shape,
 * so this only enforces the constraints the request schema can't express.
 */
function parseCommentAnchor(input: CommentAnchor): CommentAnchor {
  const result = StoredCommentAnchorSchema.safeParse(input);
  if (!result.success) {
    throw boom(
      400,
      result.error.issues[0]?.message ?? "Invalid comment anchor",
    );
  }
  return result.data;
}

export const createComment: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments",
    async (req, res) => {
      const { params, body: input } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review",
        message: "You do not have permission to comment on this build",
      });

      const thread = input.threadId
        ? await getBuildCommentThread({
            commentId: input.threadId,
            buildId: build.id,
          })
        : null;

      // A reply inherits its thread's anchor, so it can't carry its own.
      if (thread && (input.screenshotDiffId || input.anchor)) {
        throw boom(400, "A reply cannot be anchored to a screenshot diff");
      }

      // An anchor only makes sense against a diff to resolve it on.
      if (input.anchor && !input.screenshotDiffId) {
        throw boom(400, "A screenshot diff is required to anchor a comment");
      }

      let screenshotDiffId: string | null = null;
      if (input.screenshotDiffId) {
        const diff = await ScreenshotDiff.query().findOne({
          id: input.screenshotDiffId,
          buildId: build.id,
        });
        if (!diff) {
          throw boom(404, "Screenshot diff not found");
        }
        screenshotDiffId = diff.id;
      }

      const anchor = input.anchor ? parseCommentAnchor(input.anchor) : null;

      // A reply inherits its thread's review (so a reply to a draft comment
      // stays a draft); a root comment joins the user's pending review when
      // `addToReview` is set, creating that review on first use — but only when
      // the build can actually be reviewed, otherwise the draft would attach to
      // a review with no submit path and stay hidden forever.
      let buildReviewId: string | null = null;
      let pending = false;
      if (thread) {
        buildReviewId = thread.buildReviewId;
        if (buildReviewId) {
          const review = await BuildReview.query()
            .findById(buildReviewId)
            .select("state");
          pending = review?.state === "pending";
        }
      } else if (input.addToReview) {
        const [status] = await Build.getAggregatedBuildStatuses([build]);
        if (status && isReviewableBuildStatus(status)) {
          const pendingReview = await getOrCreatePendingBuildReview({
            build,
            userId: auth.user.id,
          });
          buildReviewId = pendingReview.id;
          pending = pendingReview.state === "pending";
        }
      }

      const comment = await createBuildComment({
        build,
        userId: auth.user.id,
        body: await resolveCommentBody(input.body),
        threadId: thread?.id ?? null,
        screenshotDiffId,
        anchor,
        buildReviewId,
        pending,
      });

      res.status(201).send(await serializeComment(comment));
    },
  );
};
