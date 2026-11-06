import {
  PROJECT_TOKEN_PERMISSION_LIST,
  PROJECT_TOKEN_PERMISSIONS,
} from "@argos/schemas/project-token";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  Project,
  type Account,
  type ProjectToken,
  type User,
} from "@/database/models";
import {
  createProjectToken,
  deleteProjectToken,
  filterViewableProjects,
  getProjectsByTokenId,
  getProjectTokenProjects,
  listAccountProjectTokens,
  listProjectProjectTokens,
  loadProjectToken,
} from "@/database/services/project-token";
import { boom } from "@/util/error";

import { getAccountForAuth, getProjectForAuth } from "../auth/project";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const AccountPathSchema = z.object({
  accountSlug: AccountSlug.meta({ description: "Slug of the account." }),
});

const ProjectPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
});

const TokenIdSchema = z.string().meta({ description: "ID of the token." });

const ProjectTokenPermissionSchema = z
  .enum(PROJECT_TOKEN_PERMISSION_LIST)
  .meta({
    description: [
      "What a project token can do on its projects:",
      ...PROJECT_TOKEN_PERMISSION_LIST.map(
        (permission) =>
          `- \`${permission}\`: ${PROJECT_TOKEN_PERMISSIONS[permission].description}`,
      ),
    ].join("\n"),
    id: "ProjectTokenPermission",
  });

const ProjectTokenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    projects: z.array(ProjectName).meta({
      description:
        "Names of the projects of the account the token reaches, among the ones you can see.",
    }),
    permissions: z.array(ProjectTokenPermissionSchema),
    createdAt: z.iso.datetime(),
    expireAt: z.iso.datetime().nullable(),
    lastUsedAt: z.iso.datetime().nullable().meta({
      description:
        "When CI last authenticated with the token, to a few minutes. Once it stops moving, a replaced token can be revoked safely.",
    }),
  })
  .meta({
    description:
      "A token CI and the SDK authenticate with, set as `ARGOS_TOKEN`. Its value is only returned at creation.",
    id: "ProjectToken",
  });

const CreatedProjectTokenSchema = ProjectTokenSchema.extend({
  token: z.string().meta({
    description:
      "The token itself. It is not stored and never returned again: save it now.",
  }),
}).meta({ id: "CreatedProjectToken" });

const CreateProjectTokenBodySchema = z.object({
  name: z.string().min(1).max(255).meta({
    description: "A name to recognize the token, e.g. `GitHub Actions`.",
  }),
  permissions: z
    .array(ProjectTokenPermissionSchema)
    .min(1)
    .default(["builds:write", "deployments:write"])
    .meta({
      description:
        "What the token can do. Defaults to uploading builds and deployments.",
    }),
  expireAt: z.iso.datetime().nullable().meta({
    description:
      "When the token stops working, or `null` for a token that never expires.",
  }),
});

/**
 * Serialize tokens with the projects the user may see among the ones they
 * reach: one query for the projects, one for their visibility.
 */
async function serializeProjectTokens(
  projectTokens: ProjectToken[],
  args: { account: Account; user: User },
) {
  const projectsByTokenId = await getProjectsByTokenId(
    projectTokens.map((projectToken) => projectToken.id),
  );
  const viewable = await filterViewableProjects({
    ...args,
    projects: [...projectsByTokenId.values()].flat(),
  });
  const viewableIds = new Set(viewable.map((project) => project.id));
  return projectTokens.map((projectToken) => ({
    id: projectToken.id,
    name: projectToken.name,
    projects: (projectsByTokenId.get(projectToken.id) ?? [])
      .filter((project) => viewableIds.has(project.id))
      .map((project) => project.name),
    permissions: projectToken.permissions,
    createdAt: new Date(projectToken.createdAt).toISOString(),
    expireAt: projectToken.expireAt
      ? new Date(projectToken.expireAt).toISOString()
      : null,
    lastUsedAt: projectToken.lastUsedAt
      ? new Date(projectToken.lastUsedAt).toISOString()
      : null,
  }));
}

async function serializeCreatedProjectToken(
  created: { projectToken: ProjectToken; token: string },
  args: { account: Account; user: User },
) {
  const [serialized] = await serializeProjectTokens(
    [created.projectToken],
    args,
  );
  invariant(serialized, "Created token not serialized");
  return { ...serialized, token: created.token };
}

const responses = {
  "400": invalidParameters,
  "401": unauthorized,
  "403": forbidden,
  "404": notFound,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const listAccountProjectTokensOperation = {
  operationId: "listAccountProjectTokens",
  summary: "List an account's project tokens",
  description:
    "List every project token of an account, whatever projects they are linked to. Requires administrator access to the account.",
  tags: ["Tokens"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: AccountPathSchema },
  responses: {
    "200": {
      description: "The account's project tokens, newest first",
      content: {
        "application/json": { schema: z.array(ProjectTokenSchema) },
      },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const listAccountProjectTokensHandler: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/project-tokens", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });
    const tokens = await listAccountProjectTokens({ account, user: auth.user });
    if (!tokens) {
      throw boom(403, "You are not an administrator of this account.");
    }
    res.send(
      await serializeProjectTokens(tokens, { account, user: auth.user }),
    );
  });
};

export const createAccountProjectTokenOperation = {
  operationId: "createAccountProjectToken",
  summary: "Create a project token for several projects",
  description:
    "Create a project token linked to one or more projects of an account. CI using it has to name the project it uploads to (`ARGOS_PROJECT`) when it is linked to several. Requires administrator access to the account, or to every listed project.",
  tags: ["Tokens"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: AccountPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: CreateProjectTokenBodySchema.extend({
          projects: z.array(ProjectName).min(1).meta({
            description: "Names of the projects of the account to link.",
          }),
        }),
      },
    },
  },
  responses: {
    "201": {
      description: "The created token, with its value",
      content: { "application/json": { schema: CreatedProjectTokenSchema } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const createAccountProjectTokenHandler: CreateAPIHandler = ({
  post,
}) => {
  post("/accounts/{accountSlug}/project-tokens", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });
    const names = [...new Set(req.ctx.body.projects)];
    // A project the user cannot see is reported missing, so that its name
    // cannot be probed.
    const projects = await filterViewableProjects({
      account,
      user: auth.user,
      projects: await Project.queryNotDeleted()
        .where("accountId", account.id)
        .whereIn("name", names),
    });
    const missing = names.filter(
      (name) => !projects.some((project) => project.name === name),
    );
    if (missing.length > 0) {
      throw boom(404, `Project not found: ${missing.join(", ")}.`);
    }
    const created = await createProjectToken({
      account,
      user: auth.user,
      name: req.ctx.body.name,
      projects,
      permissions: req.ctx.body.permissions,
      expireAt: req.ctx.body.expireAt,
    });
    res.status(201).send(
      await serializeCreatedProjectToken(created, {
        account,
        user: auth.user,
      }),
    );
  });
};

export const deleteAccountProjectTokenOperation = {
  operationId: "deleteAccountProjectToken",
  summary: "Revoke a project token of an account",
  description:
    "Revoke a project token: CI using it is rejected from its next request. Requires administrator access to the account, or to every project the token is linked to.",
  tags: ["Tokens"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: {
    path: AccountPathSchema.extend({ tokenId: TokenIdSchema }),
  },
  responses: {
    "204": { description: "Token revoked" },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const deleteAccountProjectTokenHandler: CreateAPIHandler = ({
  delete: del,
}) => {
  del("/accounts/{accountSlug}/project-tokens/{tokenId}", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });
    const projectToken = await loadProjectToken({
      id: req.ctx.params.tokenId,
      accountId: account.id,
    });
    await deleteProjectToken({ projectToken, user: auth.user });
    res.status(204).send();
  });
};

export const listProjectTokensOperation = {
  operationId: "listProjectTokens",
  summary: "List a project's tokens",
  description:
    "List the tokens linked to a project, including the ones linked to other projects too. Requires the reviewer role on the project.",
  tags: ["Tokens"],
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: { path: ProjectPathSchema },
  responses: {
    "200": {
      description: "The project's tokens, newest first",
      content: {
        "application/json": { schema: z.array(ProjectTokenSchema) },
      },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const listProjectTokensHandler: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/tokens", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params, null),
      req.ctx.auth(),
    ]);
    invariant(project.account, "Project account not fetched");
    const tokens = await listProjectProjectTokens({ project, user: auth.user });
    if (!tokens) {
      throw boom(
        403,
        "You do not have permission to view this project's tokens.",
      );
    }
    res.send(
      await serializeProjectTokens(tokens, {
        account: project.account,
        user: auth.user,
      }),
    );
  });
};

export const createProjectTokenOperation = {
  operationId: "createProjectToken",
  summary: "Create a project token",
  description:
    "Create a token linked to a project, to set as `ARGOS_TOKEN` in CI. To rotate a token without downtime, create its replacement, update the CI secret, then revoke the old one. Requires administrator access to the project.",
  tags: ["Tokens"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: ProjectPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: CreateProjectTokenBodySchema },
    },
  },
  responses: {
    "201": {
      description: "The created token, with its value",
      content: { "application/json": { schema: CreatedProjectTokenSchema } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const createProjectTokenHandler: CreateAPIHandler = ({ post }) => {
  post("/projects/{owner}/{project}/tokens", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params, null),
      req.ctx.auth(),
    ]);
    invariant(project.account, "Project account not fetched");
    const created = await createProjectToken({
      account: project.account,
      user: auth.user,
      name: req.ctx.body.name,
      projects: [project],
      permissions: req.ctx.body.permissions,
      expireAt: req.ctx.body.expireAt,
    });
    res.status(201).send(
      await serializeCreatedProjectToken(created, {
        account: project.account,
        user: auth.user,
      }),
    );
  });
};

export const deleteProjectTokenOperation = {
  operationId: "deleteProjectToken",
  summary: "Revoke a project token",
  description:
    "Revoke a token linked to a project: CI using it is rejected from its next request. Requires administrator access to every project the token is linked to, or to the account.",
  tags: ["Tokens"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: {
    path: ProjectPathSchema.extend({ tokenId: TokenIdSchema }),
  },
  responses: {
    "204": { description: "Token revoked" },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const deleteProjectTokenHandler: CreateAPIHandler = ({
  delete: del,
}) => {
  del("/projects/{owner}/{project}/tokens/{tokenId}", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params, null),
      req.ctx.auth(),
    ]);
    const projectToken = await loadProjectToken({
      id: req.ctx.params.tokenId,
      accountId: project.accountId,
    });
    const projects = await getProjectTokenProjects(projectToken);
    if (!projects.some((linked) => linked.id === project.id)) {
      throw boom(404, "Token not found.");
    }
    await deleteProjectToken({ projectToken, user: auth.user });
    res.status(204).send();
  });
};
