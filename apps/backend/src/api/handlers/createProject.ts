import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { createProject as createProjectService } from "@/database/services/project";
import { ProjectNameSchema } from "@/database/util/project-name";

import { getAccountForAuth } from "../auth/project";
import {
  AccountSlug,
  ProjectSchema,
  serializeProject,
} from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { personalAccessTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const CreateProjectBodySchema = z.object({
  name: ProjectNameSchema.meta({
    description:
      "Name of the project to create. Must be unique within the account (case-insensitive) and cannot be a reserved name.",
  }),
  accountSlug: AccountSlug.meta({
    description:
      "Slug of the account (personal or team) that will own the project. The personal access token must be scoped to this account and the acting user must be one of its administrators.",
  }),
});

export const createProjectOperation = {
  operationId: "createProject",
  summary: "Create a project",
  description:
    "Create a new project in an account you administer. The authenticated personal access token must be scoped to the target account, and the acting user must be an administrator of it.",
  tags: ["Projects"],
  security: personalAccessTokenAuth,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: CreateProjectBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "Project created successfully — returns the project",
      content: {
        "application/json": {
          schema: ProjectSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const createProject: CreateAPIHandler = ({ post }) => {
  return post("/projects", async (req, res) => {
    const { body } = req.ctx;
    const auth = await req.ctx.auth();

    // The token scope is the authorization boundary: it must cover the target
    // account. Resolves the in-scope account or throws 401.
    const account = getAccountForAuth(auth, { slug: body.accountSlug });

    // Shared with the GraphQL API — enforces admin permission and name rules.
    const project = await createProjectService({
      account,
      user: auth.user,
      name: body.name,
      source: null,
    });

    res.status(201).send(await serializeProject(project));
  });
};
