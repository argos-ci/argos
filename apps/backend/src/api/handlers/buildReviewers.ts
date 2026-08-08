import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  addBuildReviewers as addReviewers,
  removeBuildReviewers as removeReviewers,
} from "@/build/requestedReviewers";
import { Account, BuildRequestedReviewer } from "@/database/models";

import { assertBuildPermission, loadBuildForUserAuth } from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { serializeUser, UserSchema } from "../schema/primitives/user";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const BuildPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
});

const ReviewersBodySchema = z.object({
  userIds: z.array(z.string()).min(1).max(100).meta({
    description:
      "Identifiers of the users to act on — the `id` of a user as returned by `listBuildReviewers` or `getMe`.",
  }),
});

const ReviewersResponse = z
  .object({
    reviewers: z.array(UserSchema).meta({
      description: "The users currently requested to review the build.",
    }),
  })
  .meta({
    description: "The review requests standing on a build.",
    id: "BuildReviewers",
  });

/** The users currently requested to review the build, as the API shape. */
async function serializeReviewers(
  buildId: string,
): Promise<z.infer<typeof ReviewersResponse>> {
  const requested = await BuildRequestedReviewer.query()
    .where("buildId", buildId)
    .select("userId");
  if (requested.length === 0) {
    return { reviewers: [] };
  }
  const accounts = await Account.query().whereIn(
    "userId",
    requested.map((row) => row.userId),
  );
  return { reviewers: accounts.map(serializeUser) };
}

export const listBuildReviewersOperation = {
  operationId: "listBuildReviewers",
  summary: "List a build's requested reviewers",
  description: "List the users currently requested to review a build.",
  tags: ["Reviews"],
  // Reviewers are users, so this reads through a user-held token: a project
  // token carries no identity to resolve them against.
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: { path: BuildPathSchema },
  responses: {
    "200": {
      description: "The users requested to review the build",
      content: { "application/json": { schema: ReviewersResponse } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listBuildReviewers: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/builds/{buildNumber}/reviewers",
    async (req, res) => {
      const { build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      res.send(await serializeReviewers(build.id));
    },
  );
};

export const addBuildReviewersOperation = {
  operationId: "addBuildReviewers",
  summary: "Request reviewers on a build",
  description:
    "Ask users to review a build. Each newly-requested reviewer is notified. Idempotent: users already requested are left untouched and not notified again. Users without access to the project are ignored, and you cannot request yourself.",
  tags: ["Reviews"],
  security: patOrOAuthAuth(["reviews:write"]),
  requestParams: { path: BuildPathSchema },
  requestBody: {
    required: true,
    content: { "application/json": { schema: ReviewersBodySchema } },
  },
  responses: {
    "200": {
      description: "The users requested to review the build",
      content: { "application/json": { schema: ReviewersResponse } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const addBuildReviewers: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/reviewers",
    async (req, res) => {
      const { auth, build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      // Never trust the client — the same check gates who can see the picker.
      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review",
        message: "You cannot request reviewers for this build",
      });

      invariant(build.project);
      // Shared with the GraphQL API — same eligibility rules, same notification.
      await addReviewers({
        build,
        accountIds: req.ctx.body.userIds,
        requestedById: auth.user.id,
      });

      res.send(await serializeReviewers(build.id));
    },
  );
};

export const removeBuildReviewersOperation = {
  operationId: "removeBuildReviewers",
  summary: "Cancel review requests on a build",
  description:
    "Cancel the review requests standing on a build. Removing a user that was not requested is a no-op.",
  tags: ["Reviews"],
  security: patOrOAuthAuth(["reviews:write"]),
  requestParams: { path: BuildPathSchema },
  requestBody: {
    required: true,
    content: { "application/json": { schema: ReviewersBodySchema } },
  },
  responses: {
    "200": {
      description: "The users still requested to review the build",
      content: { "application/json": { schema: ReviewersResponse } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const removeBuildReviewers: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/reviewers",
    async (req, res) => {
      const { auth, build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review",
        message: "You cannot manage reviewers for this build",
      });

      await removeReviewers({ build, accountIds: req.ctx.body.userIds });

      res.send(await serializeReviewers(build.id));
    },
  );
};
