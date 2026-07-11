import { ProjectNameSchema } from "@argos/schemas/project";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  getAccountMetrics,
  InvalidAccountMetricsInputError,
} from "@/metrics/account";
import { boom } from "@/util/error";

import { getAccountForAuth } from "../auth/project";
import { AccountSlug } from "../schema/primitives/project";
import {
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { personalAccessTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const DateTimeSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const ProjectNamesSchema = z
  .union([ProjectNameSchema, z.array(ProjectNameSchema)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return Array.isArray(value) ? value : [value];
  });

const GetAccountAnalyticsQuerySchema = z.object({
  from: DateTimeSchema.meta({
    description: "Start of the analytics period, as an ISO 8601 datetime.",
  }),
  to: DateTimeSchema.optional().meta({
    description:
      "End of the analytics period, as an ISO 8601 datetime. Defaults to the current time.",
  }),
  groupBy: z.enum(["day", "week", "month"]).meta({
    description: "Time period used to group each series data point.",
  }),
  projectNames: ProjectNamesSchema.meta({
    description:
      "Optional project name filter. Pass one value or repeat the parameter for multiple projects.",
  }),
});

const MetricProjectsSchema = z.record(z.string(), z.number().int()).meta({
  description:
    "Counts keyed by project ID. Use the sibling `projects` array to resolve each project name.",
});

const MetricDataSchema = z.object({
  total: z.number().int(),
  projects: MetricProjectsSchema,
});

const MetricDataPointSchema = MetricDataSchema.extend({
  ts: z.number().int().meta({
    description: "Unix timestamp in milliseconds at the start of the period.",
  }),
});

const BuildMetricDataSchema = MetricDataSchema.extend({
  changesDetected: z.number().int(),
  noChanges: z.number().int(),
  accepted: z.number().int(),
  rejected: z.number().int(),
});

const BuildMetricDataPointSchema = BuildMetricDataSchema.extend({
  ts: z.number().int().meta({
    description: "Unix timestamp in milliseconds at the start of the period.",
  }),
});

const MetricProjectSchema = z.object({
  id: z.string(),
  name: ProjectNameSchema,
});

const AccountAnalyticsSchema = z
  .object({
    screenshots: z.object({
      series: z.array(MetricDataPointSchema),
      all: MetricDataSchema,
      projects: z.array(MetricProjectSchema),
    }),
    builds: z.object({
      series: z.array(BuildMetricDataPointSchema),
      all: BuildMetricDataSchema,
      projects: z.array(MetricProjectSchema),
    }),
  })
  .meta({ id: "AccountAnalytics" });

function serializeMetricProjects(projects: { id: string; name: string }[]) {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));
}

function serializeAccountAnalytics(
  metrics: Awaited<ReturnType<typeof getAccountMetrics>>,
) {
  return {
    screenshots: {
      ...metrics.screenshots,
      projects: serializeMetricProjects(metrics.screenshots.projects),
    },
    builds: {
      ...metrics.builds,
      projects: serializeMetricProjects(metrics.builds.projects),
    },
  };
}

export const getAccountAnalyticsOperation = {
  operationId: "getAccountAnalytics",
  summary: "Get account analytics",
  description:
    "Retrieve build and screenshot metrics for an account. The personal access token must be scoped to the account.",
  tags: ["Analytics"],
  security: personalAccessTokenAuth,
  requestParams: {
    path: z.object({
      accountSlug: AccountSlug.meta({
        description: "Slug of the account to retrieve analytics for.",
      }),
    }),
    query: GetAccountAnalyticsQuerySchema,
  },
  responses: {
    "200": {
      description: "Account analytics",
      content: {
        "application/json": {
          schema: AccountAnalyticsSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getAccountAnalytics: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/analytics", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    try {
      const metrics = await getAccountMetrics({
        accountId: account.id,
        ...req.ctx.query,
      });
      res.send(serializeAccountAnalytics(metrics));
    } catch (error) {
      if (error instanceof InvalidAccountMetricsInputError) {
        throw boom(400, error.message);
      }
      throw error;
    }
  });
};
