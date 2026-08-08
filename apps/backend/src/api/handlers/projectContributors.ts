import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Account } from "@/database/models";
import {
  addOrUpdateProjectContributor,
  queryProjectContributors,
  removeProjectContributor,
} from "@/database/services/project-contributor";

import { getProjectForAuth } from "../auth/project";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import {
  AccountSlug,
  ProjectName,
  ProjectUserLevel,
} from "../schema/primitives/project";
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

const ProjectPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
});

const ContributorSchema = z
  .object({
    id: z.string().meta({
      description: "Identifier of the grant, not of the user.",
    }),
    user: UserSchema,
    level: ProjectUserLevel,
  })
  .meta({
    description:
      "A contributor explicitly granted access to a project. Team owners and members reach every project without appearing here.",
    id: "ProjectContributor",
  });

export const listProjectContributorsOperation = {
  operationId: "listProjectContributors",
  summary: "List a project's contributors",
  description:
    "List the users explicitly granted access to a project, with their level. Team owners and members are not listed — they reach every project through their team role. The authenticated user comes first when they are one of them.",
  tags: ["Projects"],
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: { path: ProjectPathSchema, query: PageParamsSchema },
  responses: {
    "200": {
      description: "List of contributors",
      content: { "application/json": { schema: paginated(ContributorSchema) } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listProjectContributors: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/contributors", async (req, res) => {
    const { page, perPage } = req.ctx.query;
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    // Shared with the GraphQL API — same ordering.
    const contributors = await queryProjectContributors({
      projectId: project.id,
      currentUserId: auth.user.id,
    }).range((page - 1) * perPage, page * perPage - 1);

    // The rows carry only user ids; resolve their accounts in one query.
    const accounts = await Account.query().whereIn(
      "userId",
      contributors.results.map((row) => row.userId),
    );
    const accountsByUserId = new Map(
      accounts.flatMap((account) =>
        account.userId ? [[account.userId, account] as const] : [],
      ),
    );

    res.send({
      results: contributors.results.flatMap((row) => {
        const account = accountsByUserId.get(row.userId);
        if (!account) {
          return [];
        }
        return [
          { id: row.id, user: serializeUser(account), level: row.userLevel },
        ];
      }),
      pageInfo: { total: contributors.total, page, perPage },
    });
  });
};

const ContributorPathSchema = ProjectPathSchema.extend({
  userId: z.string().meta({
    description:
      "Identifier of the user — the `user.id` returned by `listAccountMembers` or `listProjectContributors`.",
  }),
});

export const setProjectContributorOperation = {
  operationId: "setProjectContributor",
  summary: "Grant a contributor access to a project",
  description:
    "Grant a user access to a project, or change the level they already hold. Requires administrator access to the project. Only meaningful for team contributors: owners and members already reach every project.",
  tags: ["Projects"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: ContributorPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({ level: ProjectUserLevel }),
      },
    },
  },
  responses: {
    "200": {
      description: "The granted access",
      content: { "application/json": { schema: ContributorSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const setProjectContributor: CreateAPIHandler = ({ put }) => {
  put("/projects/{owner}/{project}/contributors/{userId}", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    // Shared with the GraphQL API — same admin check, same idempotence.
    const projectUser = await addOrUpdateProjectContributor({
      project,
      user: auth.user,
      userAccountId: req.ctx.params.userId,
      level: req.ctx.body.level,
    });

    // The service resolved the user *from* this account, so it exists.
    const account = await Account.query().findOne({
      userId: projectUser.userId,
    });
    invariant(account, "contributor account not found");

    res.send({
      id: projectUser.id,
      user: serializeUser(account),
      level: projectUser.userLevel,
    });
  });
};

export const removeProjectContributorOperation = {
  operationId: "removeProjectContributor",
  summary: "Revoke a contributor's access",
  description:
    "Revoke a user's access to a project. Requires administrator access to the project, except when removing yourself — a contributor can always walk away from a project.",
  tags: ["Projects"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: ContributorPathSchema },
  responses: {
    "204": { description: "Access revoked" },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const removeProjectContributorHandler: CreateAPIHandler = ({
  delete: del,
}) => {
  del("/projects/{owner}/{project}/contributors/{userId}", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    await removeProjectContributor({
      project,
      user: auth.user,
      userAccountId: req.ctx.params.userId,
    });

    res.status(204).send();
  });
};
