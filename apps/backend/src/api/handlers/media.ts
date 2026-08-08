import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { Account, Media, MediaVersion, Project } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { getOrCreatePullRequest } from "@/github-pull-request/create";
import { createMedia } from "@/media/create";
import { finalizeMedia } from "@/media/finalize";
import { deleteUnreferencedMediaObjects } from "@/media/object";
import { getMediaPermissions, type MediaPermission } from "@/media/permissions";
import { updatePullRequestComment } from "@/media/pull-request-comment";
import { queryProjectMedia } from "@/media/query";
import {
  getLatestMediaVersion,
  getLatestMediaVersions,
  getMediaVersionCounts,
} from "@/media/version";
import { boom } from "@/util/error";

import { getProjectForAuth } from "../auth/project";
import {
  MediaInputSchema,
  MediaSchema,
  MediaUploadTargetSchema,
  serializeMedia,
} from "../schema/primitives/media";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
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

type AnyAuth = AuthProjectPayload | AuthPATPayload | AuthOAuthPayload;

const CreateMediaRequestSchema = MediaInputSchema.extend({
  project: z
    .string()
    .nullish()
    .meta({
      description:
        "Project to upload to, as `owner/project`. Required with a personal access token; ignored with a project token, which already identifies its project.",
      examples: ["acme/web"],
    }),
  prNumber: z.number().int().min(1).nullish().meta({
    description:
      "Pull request this media belongs to. Argos maintains a single comment on it listing every media uploaded, editing it in place rather than posting a new one each time — attaching a media to a pull request and showing it there are the same act, not two. Also part of the media's identity: uploading the same name again on this pull request adds a version.",
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
      projectPath: body.project ?? null,
    });

    // Resolved before the upsert, not stamped on after it: the pull request is
    // part of the media's identity, so it decides whether this upload is a new
    // media or a new version of one that is already there.
    const githubPullRequestId = await resolvePullRequest({
      project,
      prNumber: body.prNumber ?? null,
    });

    const { media, version, upload } = await createMedia({
      project,
      account,
      userId: auth.type === "project" ? null : auth.user.id,
      name: body.name,
      state: body.state ?? null,
      description: body.description ?? null,
      githubPullRequestId,
      contentType: body.contentType,
      sizeBytes: body.size,
      hash: body.hash,
      visibility: body.visibility ?? null,
      retentionDays: body.retentionDays ?? null,
    });

    // Nothing to comment about until the bytes are there. When the file was
    // already held, `createMedia` finalized it, so the comment can go up now.
    if (githubPullRequestId && version.uploadedAt) {
      await updatePullRequestComment(githubPullRequestId);
    }

    res.status(201).send({
      media: await serializeMediaWithVersion(media, version),
      upload,
    });
  });
};

export const finalizeMediaOperation = {
  operationId: "finalizeMedia",
  summary: "Finalize a media upload",
  description:
    "Confirm that a media version's bytes have been uploaded. Argos reads the object back to check the file is what it claims to be, records an image's dimensions, bills it to the screenshot meter, and updates the managed pull request comment. There is no processing step: the media is usable the moment this returns.",
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
      permission: "view",
    });

    // The version waiting on bytes is the newest one, uploaded or not — a caller
    // finalizing is telling us about the upload it was just handed a target for.
    const pending = await MediaVersion.query()
      .where("mediaId", media.id)
      .orderBy("number", "desc")
      .first();

    if (!pending) {
      throw boom(400, "This media has no upload to finalize.");
    }

    const finalized = await finalizeMedia(pending);

    if (media.githubPullRequestId) {
      await updatePullRequestComment(media.githubPullRequestId);
    }

    res.send(await serializeMediaWithVersion(media, finalized));
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
      permission: "view",
    });
    res.send(await serializeMediaWithVersion(media, null));
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
      permission: "delete",
    });

    // Every version, not just the latest: deleting a media deletes its whole
    // history. Objects first — a row deleted while its bytes survive leaves
    // storage nobody references, and there is no second pass that would find it.
    // Keys another version still points at are kept, which versions make routine:
    // reverting a screenshot produces a version sharing an older one's key.
    const versions = await MediaVersion.query().where("mediaId", media.id);
    await deleteUnreferencedMediaObjects({
      keys: versions.map((version) => version.key),
      excludeVersionIds: versions.map((version) => version.id),
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
  summary: "List a project's media",
  description:
    "List the standalone images and videos uploaded to a project, most recent first.",
  tags: ["Media"],
  security: anyTokenOrOAuthAuth(["media:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
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
  get("/projects/{owner}/{project}/media", async (req, res) => {
    const { page, perPage, search, type } = req.ctx.query;
    const project = await getProjectForAuth(req.ctx.auth(), req.ctx.params);

    // The same query the GraphQL connection uses, so the two agree on filtering
    // and ordering.
    const media = await queryProjectMedia({
      projectIds: [project.id],
      filters: { search, type },
    }).range((page - 1) * perPage, page * perPage - 1);

    res.send({
      results: await serializeMediaListWithVersions(media.results),
      pageInfo: { total: media.total, page, perPage },
    });
  });
};

/**
 * Resolve the project a new media belongs to, and its account.
 *
 * Media is project-scoped, so a project is always required. A project token
 * identifies its own; a user token has to name one as `owner/project`, and naming
 * one it cannot reach is a 401 rather than a 404 — which keeps the existence of
 * other projects undisclosed.
 *
 * The account comes along because the plan decides the size cap, the retention
 * and the visibilities allowed.
 */
async function resolveUploadTarget(args: {
  auth: AnyAuth;
  projectPath: string | null;
}): Promise<{ account: Account; project: Project }> {
  const { auth, projectPath } = args;

  const project = await (async () => {
    if (auth.type === "project") {
      return auth.project;
    }
    if (!projectPath) {
      throw boom(
        400,
        "`project` is required when uploading with a personal access token. Pass it as `owner/project`.",
      );
    }
    const [owner, name] = projectPath.split("/");
    if (!owner || !name) {
      throw boom(400, "`project` must be in the `owner/project` format.");
    }
    const resolved = await getProjectForAuth(Promise.resolve(auth), {
      owner,
      project: name,
    });
    // Uploading spends the account's quota and publishes a link under the
    // project's name, so it takes more than read access.
    const permissions = await resolved.$getPermissions(auth.user);
    if (!permissions.includes("review") && !permissions.includes("admin")) {
      throw boom(403, "You do not have permission to upload to this project.");
    }
    return resolved;
  })();

  const account = await project.$relatedQuery("account");
  invariant(account, "Project account not found");
  return { account, project };
}

/**
 * Resolve the pull request to attach a media to, when one was asked for. Needs the
 * project to be connected to a GitHub repository.
 */
async function resolvePullRequest(args: {
  project: Project;
  prNumber: number | null;
}): Promise<string | null> {
  const { project, prNumber } = args;

  if (!prNumber) {
    return null;
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
 * A project token may only reach the media of its own project; a user token needs
 * a token scoped to the owning account *and* access to the project, so
 * fine-grained project permissions apply. Either way an out-of-reach media answers
 * 404, not 403: the ids are sequential, and confirming which ones exist would let
 * a caller count another team's uploads.
 *
 * `permission` is what the action requires — `view` to read, `delete` to remove.
 */
async function loadMediaForAuth(args: {
  authPromise: Promise<AnyAuth>;
  mediaId: string;
  permission: MediaPermission;
}): Promise<Media> {
  const { mediaId, permission } = args;

  if (!isValidPgBigInt(mediaId)) {
    throw boom(400, "Invalid media ID.");
  }

  const [auth, media] = await Promise.all([
    args.authPromise,
    Media.query().findById(mediaId).withGraphFetched("project.account"),
  ]);

  if (!media) {
    throw boom(404, "Media not found");
  }

  if (auth.type === "project") {
    if (media.projectId !== auth.project.id) {
      throw boom(404, "Media not found");
    }
    return media;
  }

  invariant(media.project?.account, "Media project account not fetched");

  if (!auth.scope.some((account) => account.id === media.project?.accountId)) {
    throw boom(404, "Media not found");
  }

  const projectPermissions = await media.project.$getPermissions(auth.user);
  const permissions = getMediaPermissions({
    visibility: media.visibility,
    projectPermissions,
  });
  if (!permissions.includes(permission)) {
    throw boom(404, "Media not found");
  }

  return media;
}

/**
 * Serialize a media as of one of its versions, resolving the latest when the
 * caller doesn't have one in hand.
 *
 * A media with no uploaded version is not serveable, and no read path should be
 * able to reach one: `queryProjectMedia` filters them out and a create/finalize
 * response always has the version it just touched.
 */
async function serializeMediaWithVersion(
  media: Media,
  version: MediaVersion | null,
) {
  const [resolved, counts] = await Promise.all([
    version ?? getLatestMediaVersion(media.id),
    getMediaVersionCounts([media.id]),
  ]);
  invariant(resolved, "media has no version to serve");
  return serializeMedia(media, resolved, counts.get(media.id) ?? 1);
}

/**
 * Serialize a list, resolving every media's latest version in two queries rather
 * than two per row.
 */
async function serializeMediaListWithVersions(list: Media[]) {
  const ids = list.map((media) => media.id);
  const [latest, counts] = await Promise.all([
    getLatestMediaVersions(ids),
    getMediaVersionCounts(ids),
  ]);
  return list.flatMap((media) => {
    const version = latest.get(media.id);
    // Defensive rather than expected: the list query requires an uploaded
    // version, so a media without one here means the two disagree.
    if (!version) {
      return [];
    }
    return [serializeMedia(media, version, counts.get(media.id) ?? 1)];
  });
}
