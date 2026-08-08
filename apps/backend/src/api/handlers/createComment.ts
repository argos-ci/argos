import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getOrCreatePendingBuildReview } from "@/build/pendingReview";
import { isReviewableBuildStatus } from "@/build/reviewableStatus";
import { resolveCommentBody } from "@/comment/body";
import { createComment as createCommentService } from "@/comment/createComment";
import { Build, BuildReview, Comment, ScreenshotDiff } from "@/database/models";
import {
  CommentAnchorSchema as StoredCommentAnchorSchema,
  type CommentAnchor,
} from "@/database/models/Comment";
import { boom } from "@/util/error";

import {
  assertCommentTargetPermission,
  getTargetCommentThread,
  loadCommentTargetForUserAuth,
  type CommentAuth,
  type CommentRouteParams,
} from "../auth/comment";
import { BuildNumber } from "../schema/primitives/build";
import {
  CommentAnchorSchema,
  CommentBodyInputSchema,
  commentErrorResponses,
  CommentSchema,
  serializeComment,
  type CommentPayload,
} from "../schema/primitives/comment";
import { MediaId } from "../schema/primitives/media";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ThreadIdSchema = z.string().optional().meta({
  description:
    "Public ID of the root comment to reply to (e.g. `comment-xf23d`).",
});

const CreateCommentBodySchema = z.object({
  body: CommentBodyInputSchema,
  threadId: ThreadIdSchema,
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

const CreateTestCommentBodySchema = z.object({
  body: CommentBodyInputSchema,
  threadId: ThreadIdSchema,
});

const CreateMediaCommentBodySchema = z.object({
  body: CommentBodyInputSchema,
  threadId: ThreadIdSchema,
  anchor: CommentAnchorSchema.optional(),
});

const responses = {
  "201": {
    description: "Comment created successfully — returns the comment",
    content: {
      "application/json": {
        schema: CommentSchema,
      },
    },
  },
  ...commentErrorResponses,
};

export const createBuildCommentOperation = {
  operationId: "createBuildComment",
  summary: "Post a comment (or reply) on a build",
  description:
    "Post a comment on a build. Start a new thread, reply to an existing one with `threadId`, optionally anchor the comment to a screenshot diff, or attach it to your pending review with `addToReview`.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
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
  responses,
} satisfies ZodOpenApiOperationObject;

export const createTestCommentOperation = {
  operationId: "createTestComment",
  summary: "Post a comment (or reply) on a test",
  description:
    "Post a comment on a test. Start a new thread, or reply to an existing one with `threadId`.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
    }),
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: CreateTestCommentBodySchema,
      },
    },
  },
  responses,
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

/**
 * Resolve the build-only options of a comment: the diff it is anchored to and
 * the review it belongs to. A reply inherits both from its thread, so it may not
 * carry its own anchor.
 */
async function resolveBuildCommentOptions(input: {
  build: Build;
  userId: string;
  thread: Comment | null;
  body: z.infer<typeof CreateCommentBodySchema>;
}) {
  const { build, userId, thread, body: requestBody } = input;

  // A reply inherits its thread's anchor, so it can't carry its own.
  if (thread && (requestBody.screenshotDiffId || requestBody.anchor)) {
    throw boom(400, "A reply cannot be anchored to a screenshot diff");
  }

  // An anchor only makes sense against a diff to resolve it on.
  if (requestBody.anchor && !requestBody.screenshotDiffId) {
    throw boom(400, "A screenshot diff is required to anchor a comment");
  }

  let screenshotDiffId: string | null = null;
  if (requestBody.screenshotDiffId) {
    const diff = await ScreenshotDiff.query().findOne({
      id: requestBody.screenshotDiffId,
      buildId: build.id,
    });
    if (!diff) {
      throw boom(404, "Screenshot diff not found");
    }
    screenshotDiffId = diff.id;
  }

  const anchor = requestBody.anchor
    ? parseCommentAnchor(requestBody.anchor)
    : null;

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
  } else if (requestBody.addToReview) {
    const [status] = await Build.getAggregatedBuildStatuses([build]);
    if (status && isReviewableBuildStatus(status)) {
      const pendingReview = await getOrCreatePendingBuildReview({
        build,
        userId,
      });
      buildReviewId = pendingReview.id;
      pending = pendingReview.state === "pending";
    }
  }

  return { screenshotDiffId, anchor, buildReviewId, pending };
}

export const createMediaCommentOperation = {
  operationId: "createMediaComment",
  summary: "Post a comment (or reply) on a media",
  description:
    "Post a comment on an uploaded media. Start a new thread, or reply to an existing one with `threadId`. Pass an `anchor` to pin the comment to a point on the image — normalized coordinates, so it survives any scaling — which is how a reviewer marks up a screenshot.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: {
    path: z.object({
      mediaId: MediaId,
    }),
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: CreateMediaCommentBodySchema,
      },
    },
  },
  responses,
} satisfies ZodOpenApiOperationObject;

/**
 * Resolve the anchor of a media comment.
 *
 * A media anchor needs no diff to resolve against — the media *is* the subject —
 * which is why the database constraint accepts an anchor whose target is a media.
 * A reply inherits its thread's anchor, so it may not carry its own.
 */
function resolveMediaCommentOptions(input: {
  thread: Comment | null;
  body: z.infer<typeof CreateMediaCommentBodySchema>;
}): { anchor: CommentAnchor | null } {
  const { thread, body: requestBody } = input;

  if (thread && requestBody.anchor) {
    throw boom(400, "A reply cannot carry its own anchor");
  }

  if (!requestBody.anchor) {
    return { anchor: null };
  }

  const anchor = parseCommentAnchor(requestBody.anchor);

  // A line range describes a textual snapshot. An uploaded image or video has
  // no lines, so only a point makes sense here.
  if (anchor.type !== "point") {
    throw boom(400, "A media comment can only be anchored to a point");
  }

  return { anchor };
}

/**
 * Shared by the build-, test- and media-scoped create endpoints. Reviews and
 * snapshot anchors only exist on a build, and the other endpoints' request bodies
 * don't accept them, so their comments are created without.
 */
async function createTargetComment(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams;
  body: z.infer<typeof CreateCommentBodySchema>;
}): Promise<CommentPayload> {
  const { body: requestBody } = input;
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  await assertCommentTargetPermission({
    target,
    user: auth.user,
    permission: "review",
    message: `You do not have permission to comment on this ${target.type}`,
  });

  const thread = requestBody.threadId
    ? await getTargetCommentThread({
        commentId: requestBody.threadId,
        target,
      })
    : null;

  const targetOptions = await (async () => {
    switch (target.type) {
      case "build":
        return resolveBuildCommentOptions({
          build: target.build,
          userId: auth.user.id,
          thread,
          body: requestBody,
        });
      case "media":
        return resolveMediaCommentOptions({ thread, body: requestBody });
      case "test":
        return null;
    }
  })();

  const comment = await createCommentService({
    target,
    userId: auth.user.id,
    body: await resolveCommentBody(requestBody.body),
    threadId: thread?.id ?? null,
    ...targetOptions,
  });

  return serializeComment(comment);
}

export const createComment: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments",
    async (req, res) => {
      res.status(201).send(
        await createTargetComment({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          body: req.ctx.body,
        }),
      );
    },
  );

  post(
    "/projects/{owner}/{project}/tests/{testId}/comments",
    async (req, res) => {
      res.status(201).send(
        await createTargetComment({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          body: req.ctx.body,
        }),
      );
    },
  );

  post("/media/{mediaId}/comments", async (req, res) => {
    res.status(201).send(
      await createTargetComment({
        authPromise: req.ctx.auth(),
        params: req.ctx.params,
        body: req.ctx.body,
      }),
    );
  });
};
