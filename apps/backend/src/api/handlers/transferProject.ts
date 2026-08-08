import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { transferProject as transferProjectService } from "@/database/services/project";

import { getAccountForAuth, getProjectForAuth } from "../auth/project";
import {
  AccountSlug,
  ProjectName,
  ProjectSchema,
  serializeProject,
} from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const transferProjectOperation = {
  operationId: "transferProject",
  summary: "Transfer a project",
  description:
    "Move a project to another account, optionally renaming it. The token must be scoped to both accounts, and the acting user must administer the project as well as the account receiving it.",
  tags: ["Projects"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({
          targetAccountSlug: AccountSlug.meta({
            description: "Slug of the account that will own the project.",
          }),
          name: ProjectName.optional().meta({
            description:
              "Name to give the project on the target account. Defaults to its current name, which must be free there.",
          }),
        }),
      },
    },
  },
  responses: {
    "200": {
      description: "The transferred project",
      content: { "application/json": { schema: ProjectSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const transferProject: CreateAPIHandler = ({ post }) => {
  post("/projects/{owner}/{project}/transfer", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    // The token must cover the destination too: without this, a token scoped to
    // the source account alone could push the project onto any team the user
    // happens to administer.
    const targetAccount = getAccountForAuth(auth, {
      slug: req.ctx.body.targetAccountSlug,
    });

    // Shared with the GraphQL API — same admin checks on both sides.
    const transferred = await transferProjectService({
      project,
      user: auth.user,
      targetAccount,
      name: req.ctx.body.name ?? project.name,
    });

    res.send(await serializeProject(transferred));
  });
};
