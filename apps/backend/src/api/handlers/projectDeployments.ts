import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Deployment } from "@/database/models";
import { assertProjectAdmin } from "@/database/services/project";
import {
  getProductionInternalProjectDomain,
  upsertProductionInternalProjectDomain,
} from "@/database/services/project-domain";

import { getProjectForAuth } from "../auth/project";
import {
  DeploymentSchema,
  serializeDeployment,
} from "../schema/primitives/deployment";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth, patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ProjectPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
});

export const listProjectDeploymentsOperation = {
  operationId: "listProjectDeployments",
  summary: "List a project's deployments",
  description:
    'List a project\'s deployments, most recent first. Use `environment` to keep only the production ones — the deployments that answer "what is live right now?".',
  tags: ["Deployments"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: ProjectPathSchema,
    query: PageParamsSchema.extend({
      environment: z
        .enum(["preview", "production"])
        .optional()
        .meta({ description: "Restrict to one environment." }),
    }),
  },
  responses: {
    "200": {
      description: "List of deployments",
      content: { "application/json": { schema: paginated(DeploymentSchema) } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listProjectDeployments: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/deployments", async (req, res) => {
    const { page, perPage, environment } = req.ctx.query;
    const project = await getProjectForAuth(req.ctx.auth(), req.ctx.params);

    // Shared ordering with the GraphQL API (`Project.deployments`).
    const query = Deployment.query()
      .where("projectId", project.id)
      .orderBy([
        { column: "createdAt", order: "desc" },
        { column: "id", order: "desc" },
      ]);

    if (environment) {
      query.where("environment", environment);
    }

    const deployments = await query.range(
      (page - 1) * perPage,
      page * perPage - 1,
    );

    res.send({
      results: deployments.results.map(serializeDeployment),
      pageInfo: { total: deployments.total, page, perPage },
    });
  });
};

const ProjectDomainSchema = z
  .object({
    domain: z.string().nullable().meta({
      description:
        "The project's production deployment domain, `null` when deployments are disabled or no domain is set.",
    }),
  })
  .meta({
    description: "A project's production deployment domain.",
    id: "ProjectDomain",
  });

export const getProjectDomainOperation = {
  operationId: "getProjectDomain",
  summary: "Get a project's deployment domain",
  description:
    "Retrieve the domain the project's production deployments are served on.",
  tags: ["Deployments"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: { path: ProjectPathSchema },
  responses: {
    "200": {
      description: "The production deployment domain",
      content: { "application/json": { schema: ProjectDomainSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getProjectDomain: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/domain", async (req, res) => {
    const project = await getProjectForAuth(req.ctx.auth(), req.ctx.params);

    if (!project.deploymentEnabled) {
      res.send({ domain: null });
      return;
    }

    const projectDomain = await getProductionInternalProjectDomain(project.id);
    res.send({ domain: projectDomain?.domain ?? null });
  });
};

export const updateProjectDomainOperation = {
  operationId: "updateProjectDomain",
  summary: "Set a project's deployment domain",
  description:
    "Set the domain the project's production deployments are served on. Requires administrator access to the project. Only domains under the Argos deployments domain are accepted, and reserved slugs are refused.",
  tags: ["Deployments"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: ProjectPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({
          domain: z.string().min(1).meta({
            description:
              "The full domain to serve production deployments on, under the Argos deployments domain — e.g. `acme-web.argos-ci.live`.",
            example: "acme-web.argos-ci.live",
          }),
        }),
      },
    },
  },
  responses: {
    "200": {
      description: "The updated production deployment domain",
      content: { "application/json": { schema: ProjectDomainSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const updateProjectDomain: CreateAPIHandler = ({ put }) => {
  put("/projects/{owner}/{project}/domain", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    await assertProjectAdmin({ project, user: auth.user });

    // Shared with the GraphQL API — same validation, normalization and alias
    // syncing.
    const { projectDomain } = await upsertProductionInternalProjectDomain({
      projectId: project.id,
      domain: req.ctx.body.domain,
    });

    res.send({ domain: projectDomain.domain });
  });
};
