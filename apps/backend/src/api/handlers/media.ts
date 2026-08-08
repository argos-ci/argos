import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { Account, Media, Project } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { getOrCreatePullRequest } from "@/github-pull-request/create";
import { createMedia } from "@/media/create";
import { finalizeMedia } from "@/media/finalize";
import { deleteUnreferencedMediaObjects } from "@/media/object";
import { getMediaPermissions } from "@/media/permissions";
import { updatePullRequestComment } from "@/media/pull-request-comment";
import { queryAccountMedia } from "@/media/query";
import { boom } from "@/util/error";

import { getAccountForAuth } from "../auth/project";
import {
  MediaInputSchema,
  MediaSchema,
  MediaUploadTargetSchema,
  serializeMedia,
  serializeMediaList,
} from "../schema/primitives/media";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

type AnyAuth = AuthProjectPayload | AuthPATPayload | AuthOAuthPayload;

const CreateMediaRequestSchema = MediaInputSchema.extend({
  accountSlug: AccountSlug.nullish().meta({
    description:
      "Team to upload to. Required with a personal access token; ignored with a project token, which already identifies its team.",
  }),
  prNumber: z.number().int().min(1).nullish().meta({
    description:
      "Pull request to attach the media to. With `comment`, Argos maintains a single comment on it listing every media uploaded, editing it in place rather than posting a new one each time.",
  }),
  comment: z.boolean().nullish().meta({
    description:
      "Post (or update) the managed pull request comment. Requires `prNumber` and a project connected to GitHub.",
  }),
});

const CreateMediaResponseSchema = z.object({
  media: MediaSchema,
  upload: MediaUploadTargetSchema.nullable().meta({
    description:
      "Where to send the bytes, or `null` when Argos already holds this exact file — in which case the media is ready and nothing needs uploading.",
  }),
});

export const createMediaOperation = {
  operationId: "createMedia",
  summary: "Create a media upload",
  description: [
    "Register a standalone image or video and receive a signed target to upload it to.",
    "",
    "Uploading takes three calls:",
    "",
    "1. `POST /media` — declare the file and get back an `upload` target.",
    "2. `POST` the file to `upload.url` as `multipart/form-data`, appending every entry of `upload.fields` **before** the `file` part.",
    "3. `POST /media/{mediaId}/finalize` — confirm the bytes landed.",
    "",
    "When `upload` comes back `null`, Argos already holds this exact file and steps 2 and 3 are unnecessary.",
    "",
    "The `argos media upload` CLI command does all of this in one step.",
  ].join("\n"),
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["media:write"]),
  requestBody: {
    content: {
      "application/json": {
        schema: CreateMediaRequestSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The registered media and where to upload it",
      content: {
        "application/json": {
          schema: CreateMediaResponseSchema,
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

export const createMediaHandler: CreateAPIHandler = ({ post }) => {
  post("/media", async (req, res) => {
    const auth = await req.ctx.auth();
    const body = req.ctx.body;

    const { account, project } = await resolveUploadTarget({
      auth,
      accountSlug: body.accountSlug ?? null,
    });

    const githubPullRequestId = await resolvePullRequest({
      project,
      prNumber: body.prNumber ?? null,
      comment: body.comment ?? false,
    });

    const { media, upload } = await createMedia({
      account,
      project,
      userId: auth.type === "project" ? null : auth.user.id,
      name: body.name,
      contentType: body.contentType,
      sizeBytes: body.size,
      hash: body.hash,
      slug: body.slug ?? null,
      visibility: body.visibility ?? null,
      retentionDays: body.retentionDays ?? null,
    });

    // Stamped after creation rather than passed through: the pull request is a
    // property of *this* upload request, and a media re-uploaded under the same
    // slug for a different pull request has to move with it.
    const linked = githubPullRequestId
      ? await media.$query().patchAndFetch({ githubPullRequestId })
      : media;

    // Nothing to comment about until the bytes are there. When the file was
    // already held, `createMedia` finalized it, so the comment can go up now.
    if (githubPullRequestId && linked.uploadedAt) {
      await updatePullRequestComment(githubPullRequestId);
    }

    res.status(201).send({
      media: serializeMedia(linked),
      upload,
    });
  });
};

export const finalizeMediaOperation = {
  operationId: "finalizeMedia",
  summary: "Finalize a media upload",
  description:
    "Confirm that a media's bytes have been uploaded. Argos reads the object back, starts processing it (poster frame for videos, metadata stripping), bills it to the screenshot meter, and updates the managed pull request comment when one was requested.",
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["media:write"]),
  requestParams: {
    path: z.object({
      mediaId: z.string().meta({ description: "The media ID" }),
    }),
  },
  responses: {
    "200": {
      description: "The finalized media",
      content: {
        "application/json": {
          schema: MediaSchema,
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

export const finalizeMediaHandler: CreateAPIHandler = ({ post }) => {
  post("/media/{mediaId}/finalize", async (req, res) => {
    const media = await loadMediaForAuth({
      authPromise: req.ctx.auth(),
      mediaId: req.ctx.params.mediaId,
    });

    const finalized = await finalizeMedia(media);

    if (finalized.githubPullRequestId) {
      await updatePullRequestComment(finalized.githubPullRequestId);
    }

    res.send(serializeMedia(finalized));
  });
};

export const getMediaOperation = {
  operationId: "getMedia",
  summary: "Get a media",
  description:
    "Retrieve a single media by its ID, including its share URL and ready-to-paste Markdown.",
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["media:read"]),
  requestParams: {
    path: z.object({
      mediaId: z.string().meta({ description: "The media ID" }),
    }),
  },
  responses: {
    "200": {
      description: "Media details",
      content: {
        "application/json": {
          schema: MediaSchema,
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

export const getMediaHandler: CreateAPIHandler = ({ get }) => {
  get("/media/{mediaId}", async (req, res) => {
    const media = await loadMediaForAuth({
      authPromise: req.ctx.auth(),
      mediaId: req.ctx.params.mediaId,
    });
    res.send(serializeMedia(media));
  });
};

export const deleteMediaOperation = {
  operationId: "deleteMedia",
  summary: "Delete a media",
  description:
    "Delete a media and the files behind it. Any share link or pull request embed pointing at it stops working immediately.",
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["media:write"]),
  requestParams: {
    path: z.object({
      mediaId: z.string().meta({ description: "The media ID" }),
    }),
  },
  responses: {
    "204": { description: "Media deleted" },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const deleteMediaHandler: CreateAPIHandler = ({ delete: del }) => {
  del("/media/{mediaId}", async (req, res) => {
    const media = await loadMediaForAuth({
      authPromise: req.ctx.auth(),
      mediaId: req.ctx.params.mediaId,
    });

    // Objects first: a row deleted while its bytes survive leaves storage nobody
    // references, and there is no second pass that would find it. Keys another
    // media still points at are kept — the same file uploaded twice shares one.
    await deleteUnreferencedMediaObjects({
      keys: [media.key],
      excludeMediaIds: [media.id],
    });
    await media.$query().delete();

    // The comment lists what is still there, so it has to lose this entry.
    if (media.githubPullRequestId) {
      await updatePullRequestComment(media.githubPullRequestId);
    }

    res.status(204).send();
  });
};

export const listMediaOperation = {
  operationId: "listMedia",
  summary: "List a team's media",
  description:
    "List the standalone images and videos uploaded to a team, most recent first. Requires administrator access to the team.",
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["media:read"]),
  requestParams: {
    path: z.object({
      accountSlug: AccountSlug.meta({
        description: "Slug of the team to list media for.",
      }),
    }),
    query: PageParamsSchema.extend({
      search: z.string().optional().meta({
        description: "Match media on their file name or slug.",
      }),
      type: z.enum(["image", "video"]).optional().meta({
        description: "Restrict to images or to videos.",
      }),
    }),
  },
  responses: {
    "200": {
      description: "List of media",
      content: {
        "application/json": {
          schema: paginated(MediaSchema),
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

export const listMediaHandler: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/media", async (req, res) => {
    const { page, perPage, search, type } = req.ctx.query;
    const auth = await req.ctx.auth();

    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    await assertMediaLibraryAccess({ account, auth });

    // The same query the GraphQL connection uses, so the two agree on filtering
    // and ordering.
    const media = await queryAccountMedia({
      accountId: account.id,
      filters: { search, type },
    }).range((page - 1) * perPage, page * perPage - 1);

    res.send({
      results: serializeMediaList(media.results),
      pageInfo: { total: media.total, page, perPage },
    });
  });
};

/**
 * Resolve which account a new media belongs to, and which project it came from.
 *
 * A project token identifies both without being asked. A user token identifies a
 * set of accounts, so the caller has to name one — and naming one it is not scoped
 * to is a 401 rather than a 404, which is what keeps the existence of other
 * accounts undisclosed.
 */
async function resolveUploadTarget(args: {
  auth: AnyAuth;
  accountSlug: string | null;
}): Promise<{ account: Account; project: Project | null }> {
  const { auth, accountSlug } = args;

  if (auth.type === "project") {
    const account = await auth.project.$relatedQuery("account");
    invariant(account, "Project account not found");
    return { account, project: auth.project };
  }

  if (!accountSlug) {
    throw boom(
      400,
      "`accountSlug` is required when uploading with a personal access token.",
    );
  }

  return {
    account: getAccountForAuth(auth, { slug: accountSlug }),
    project: null,
  };
}

/**
 * Resolve the pull request to attach a media to, when one was asked for.
 *
 * Needs a project connected to GitHub, which in practice means a project token:
 * that is what CI and agents hold, and it is the only caller that knows which
 * repository it is running against.
 */
async function resolvePullRequest(args: {
  project: Project | null;
  prNumber: number | null;
  comment: boolean;
}): Promise<string | null> {
  const { project, prNumber, comment } = args;

  if (!prNumber) {
    if (comment) {
      throw boom(400, "`prNumber` is required when `comment` is `true`.");
    }
    return null;
  }

  if (!project) {
    throw boom(
      400,
      "Attaching a media to a pull request requires a project token.",
    );
  }

  if (!project.githubRepositoryId) {
    throw boom(
      400,
      "This project is not connected to a GitHub repository, so Argos cannot resolve the pull request.",
    );
  }

  const pullRequest = await getOrCreatePullRequest({
    githubRepositoryId: project.githubRepositoryId,
    number: prNumber,
  });

  return pullRequest.id;
}

/**
 * Load a media the caller is allowed to act on.
 *
 * A project token may only reach the media of its own project; a user token may
 * reach anything in the accounts it is scoped to. Either way an out-of-reach media
 * answers 404, not 403: the ids are sequential, and confirming which ones exist
 * would let a caller count another team's uploads.
 */
async function loadMediaForAuth(args: {
  authPromise: Promise<AnyAuth>;
  mediaId: string;
}): Promise<Media> {
  const { mediaId } = args;

  if (!isValidPgBigInt(mediaId)) {
    throw boom(400, "Invalid media ID.");
  }

  const [auth, media] = await Promise.all([
    args.authPromise,
    Media.query().findById(mediaId),
  ]);

  if (!media) {
    throw boom(404, "Media not found");
  }

  switch (auth.type) {
    case "project": {
      if (media.projectId !== auth.project.id) {
        throw boom(404, "Media not found");
      }
      return media;
    }
    case "pat":
    case "oauth": {
      if (!auth.scope.some((account) => account.id === media.accountId)) {
        throw boom(404, "Media not found");
      }
      return media;
    }
  }
}

/**
 * The media library lists everything a team ever uploaded, across projects a given
 * member may not have access to, so browsing it is an administrator's privilege.
 * Reading one media through its share link is a different question, answered by
 * the share page.
 */
async function assertMediaLibraryAccess(args: {
  account: Account;
  auth: AnyAuth;
}): Promise<void> {
  const { account, auth } = args;
  if (auth.type === "project") {
    throw boom(401, "Listing a team's media requires a personal access token.");
  }
  const permissions = await account.$getPermissions(auth.user);
  if (getMediaPermissions(permissions).length === 0) {
    throw boom(403, "You are not an administrator of this team.");
  }
}
