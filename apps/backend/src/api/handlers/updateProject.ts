import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { updateProject as updateProjectService } from "@/database/services/project";

import { getProjectForAuth } from "../auth/project";
import {
  AccountSlug,
  DeploymentAuth,
  IgnoreConfigSchema,
  ProjectName,
  ProjectSchema,
  ProjectUserLevel,
  serializeProject,
  SummaryCheck,
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

/**
 * Every field is optional, and only the ones present are written — a caller can
 * change one setting without restating the rest. `null` on a nullable setting
 * clears the override and restores the value inherited from the repository.
 */
const UpdateProjectBodySchema = z
  .object({
    name: ProjectName.meta({
      description:
        "New name for the project. Must be unique within the owning account (case-insensitive).",
    }),
    defaultBaseBranch: z.string().nullable().meta({
      description:
        "Branch used as the baseline when no better one applies. `null` falls back to the repository's default branch.",
    }),
    autoApprovedBranchGlob: z.string().nullable().meta({
      description:
        "Glob matching the branches whose builds are approved automatically. `null` falls back to the default base branch.",
    }),
    deploymentProductionBranchGlob: z.string().nullable().meta({
      description:
        "Glob matching the branches whose deployments count as production. `null` falls back to the repository's default branch.",
    }),
    private: z.boolean().nullable().meta({
      description:
        "Force the project's privacy. `null` inherits it from the linked repository.",
    }),
    summaryCheck: SummaryCheck,
    defaultUserLevel: ProjectUserLevel.nullable().meta({
      description:
        "Access given to team members that are not contributors on this project. `null` gives them none.",
    }),
    ignoreConfig: IgnoreConfigSchema,
    deploymentEnabled: z.boolean(),
    deploymentAuth: DeploymentAuth,
    githubActionsOidcEnabled: z.boolean(),
    tokenlessAuthEnabled: z.boolean(),
  })
  .partial();

export const updateProjectOperation = {
  operationId: "updateProject",
  summary: "Update a project",
  description:
    "Update a project's settings. Only the fields present in the request are changed. Requires administrator access to the project.",
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
        schema: UpdateProjectBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated project",
      content: { "application/json": { schema: ProjectSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const updateProject: CreateAPIHandler = ({ patch }) => {
  patch("/projects/{owner}/{project}", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    // Shared with the GraphQL API — same admin check, same validation.
    const updated = await updateProjectService({
      project,
      user: auth.user,
      input: req.ctx.body,
    });

    res.send(await serializeProject(updated));
  });
};
