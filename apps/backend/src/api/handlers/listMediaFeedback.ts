import { MediaStateSchema } from "@argos/schemas/media";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { filterVisibleComments } from "@/comment/getVisibleComments";
import { Comment, Media, MediaVersion } from "@/database/models";
import { getMediaFileUrl, getMediaPosterUrl } from "@/media/serve";
import { getLatestMediaVersions } from "@/media/version";
import { boom } from "@/util/error";

import { getProjectForAuth } from "../auth/project";
import { CommentSchema, serializeComment } from "../schema/primitives/comment";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

/**
 * How many media a single feedback fetch covers. A pull request with more
 * uploaded media than this has other problems, and an unbounded fan-out here
 * would let one request read a project's whole history.
 */
const MAX_MEDIA = 100;

const MediaFeedbackSchema = z
  .object({
    media: z
      .object({
        id: z.string(),
        name: z.string(),
        state: MediaStateSchema.nullable(),
        version: z.number().meta({
          description:
            "Which version this feedback is about — always the newest, since that is the one to fix.",
        }),
        url: z.url().meta({ description: "Share page URL" }),
        fileUrl: z.url().meta({
          description:
            "URL of the image or video itself, for an agent that wants to look at it.",
        }),
        posterUrl: z.url().nullable(),
        width: z.number().nullable(),
        height: z.number().nullable(),
      })
      .meta({ description: "The media the comments were left on" }),
    comments: z.array(CommentSchema).meta({
      description:
        "The comments on this media, oldest first. A comment's `anchor` gives the normalized (x, y) it points at, so an agent can tell which part of the screenshot the feedback is about.",
    }),
  })
  .meta({
    description: "Comments left on one media",
    id: "MediaFeedback",
  });

export const listMediaFeedbackOperation = {
  operationId: "listMediaFeedback",
  summary: "List the feedback on a project's media",
  description: [
    "Every comment left on a project's uploaded media, grouped by media — the whole review in one call.",
    "",
    "This is the endpoint to use after a human has marked up screenshots and asked you to act on their feedback. Filter to a pull request with `prNumber` and to open threads with `resolved=false`, then read each comment's `anchor` to see which part of the image it points at.",
  ].join("\n"),
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["comments:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
    query: z.object({
      prNumber: z
        .string()
        .optional()
        .transform((value, ctx) => {
          if (value === undefined) {
            return undefined;
          }
          const parsed = Number(value);
          if (!Number.isInteger(parsed) || parsed < 1) {
            ctx.addIssue({
              code: "custom",
              message: "must be a positive integer",
            });
            return z.NEVER;
          }
          return parsed;
        })
        .meta({
          description:
            "Only media attached to this pull request. Omit for every media in the project.",
        }),
      resolved: z.enum(["true", "false"]).optional().meta({
        description:
          "Filter by thread resolution. `false` is what you want when acting on feedback: it leaves out what has already been dealt with.",
      }),
    }),
  },
  responses: {
    "200": {
      description: "Feedback grouped by media",
      content: {
        "application/json": {
          schema: z.object({ results: z.array(MediaFeedbackSchema) }),
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

export const listMediaFeedback: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/media/comments", async (req, res) => {
    const { prNumber, resolved } = req.ctx.query;
    const [auth, project] = await Promise.all([
      req.ctx.auth(),
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
    ]);

    const viewerUserId = auth.type === "project" ? null : auth.user.id;

    const mediaQuery = Media.query()
      .where("projectId", project.id)
      // At least one landed upload: expiry and completion live on the versions.
      .whereExists(
        MediaVersion.query()
          .select(1)
          .whereColumn("media_versions.mediaId", "media.id")
          .whereNotNull("media_versions.uploadedAt"),
      )
      .orderBy("createdAt", "asc")
      .limit(MAX_MEDIA);

    if (prNumber !== undefined) {
      if (!project.githubRepositoryId) {
        throw boom(
          400,
          "This project is not connected to a GitHub repository, so it has no pull requests.",
        );
      }
      mediaQuery
        .joinRelated("githubPullRequest")
        .where("githubPullRequest.number", prNumber);
    }

    const media = await mediaQuery;

    if (media.length === 0) {
      res.send({ results: [] });
      return;
    }

    const comments = await findComments({
      mediaIds: media.map((item) => item.id),
      viewerUserId,
      resolved: resolved === undefined ? null : resolved === "true",
    });

    const commentsByMediaId = new Map<string, Comment[]>();
    for (const comment of comments) {
      if (!comment.mediaId) {
        continue;
      }
      const list = commentsByMediaId.get(comment.mediaId) ?? [];
      list.push(comment);
      commentsByMediaId.set(comment.mediaId, list);
    }

    // Media with no comments is dropped: the caller asked what the feedback is,
    // and a screenshot nobody commented on is not part of the answer.
    const commented = media.filter((item) => commentsByMediaId.has(item.id));

    // The file the caller should go and look at is the *newest* one. Feedback on
    // an image that has since been re-uploaded is exactly the case this endpoint
    // exists for, so pointing at an old version would send an agent to fix a
    // screenshot it already replaced.
    const latestVersions = await getLatestMediaVersions(
      commented.map((item) => item.id),
    );

    const results = await Promise.all(
      commented.map(async (item) => {
        const version = latestVersions.get(item.id);
        invariant(version, "a listed media has an uploaded version");
        return {
          media: {
            id: item.id,
            name: item.name,
            state: item.state,
            version: version.number,
            url: item.url,
            fileUrl: getMediaFileUrl(version),
            posterUrl: getMediaPosterUrl(version),
            width: version.width,
            height: version.height,
          },
          comments: await Promise.all(
            (commentsByMediaId.get(item.id) ?? []).map((comment) =>
              serializeComment(comment),
            ),
          ),
        };
      }),
    );

    res.send({ results });
  });
};

/**
 * Load the visible comments on a set of media, filtered by thread resolution.
 *
 * Resolution lives on the **root** comment of a thread — replies leave it null
 * and inherit — so filtering has to look at the root, not at each row. A reply to
 * an unresolved thread is unresolved feedback and has to come back with it.
 */
async function findComments(args: {
  mediaIds: string[];
  viewerUserId: string | null;
  resolved: boolean | null;
}): Promise<Comment[]> {
  const query = filterVisibleComments(
    Comment.query().whereIn("mediaId", args.mediaIds),
    args.viewerUserId,
  ).orderBy("createdAt", "asc");

  if (args.resolved !== null) {
    const rootIsResolved = args.resolved;
    query.whereExists(
      Comment.query()
        .alias("root")
        .select(1)
        // A root comment is its own thread root.
        .whereRaw('"root"."id" = coalesce(??, ??)', [
          "comments.threadId",
          "comments.id",
        ])
        .modify((sub) => {
          if (rootIsResolved) {
            sub.whereNotNull("root.resolvedAt");
          } else {
            sub.whereNull("root.resolvedAt");
          }
        }),
    );
  }

  return query;
}
