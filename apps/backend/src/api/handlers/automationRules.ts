import { AutomationConditionSchema } from "@argos/schemas/automation-condition";
import { AutomationEventSchema } from "@argos/schemas/automation-event";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { AutomationRule } from "@/database/models";
import {
  AutomationActionInputSchema,
  createAutomationRule as createRule,
  deactivateAutomationRule as deactivateRule,
  getAutomationRuleForAdmin,
  queryAutomationRules,
  updateAutomationRule as updateRule,
} from "@/database/services/automation-rule";
import { assertProjectAdmin } from "@/database/services/project";

import { getProjectForAuth } from "../auth/project";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
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

const ProjectPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
});

const RulePathSchema = ProjectPathSchema.extend({
  ruleId: z
    .string()
    .meta({ description: "Identifier of the automation rule." }),
});

const AutomationEvent = AutomationEventSchema.meta({
  description: "An event an automation rule can react to.",
  id: "AutomationEvent",
});

const AutomationCondition = AutomationConditionSchema.meta({
  description:
    "A condition narrowing when a rule fires. Conditions are combined with AND; wrap one in `{ not: … }` to negate it, or `{ glob: … }` to match a branch by pattern.",
  id: "AutomationCondition",
});

const AutomationActionInput = AutomationActionInputSchema.meta({
  description:
    "An action to run. Slack channels are addressed by `slackId` when known, otherwise by `name`; Teams and Discord by the id of a webhook registered on the project's account.",
  id: "AutomationActionInput",
});

const AutomationRuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    active: z.boolean().meta({
      description:
        "Whether the rule still fires. Deactivated rules keep their run history.",
    }),
    events: z.array(AutomationEvent),
    conditions: z.array(AutomationCondition),
    actions: z
      .array(
        z.object({
          action: z.string(),
          actionPayload: z.record(z.string(), z.unknown()),
        }),
      )
      .meta({
        description:
          "The actions as stored, with their targets already resolved (a Slack channel id, a webhook id).",
      }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({
    description:
      "A rule that runs actions when a build event matches its conditions.",
    id: "AutomationRule",
  });

function serializeAutomationRule(
  rule: AutomationRule,
): z.infer<typeof AutomationRuleSchema> {
  return {
    id: rule.id,
    name: rule.name,
    active: rule.active,
    events: rule.on,
    conditions: rule.if.all,
    actions: rule.then,
    createdAt: new Date(rule.createdAt).toISOString(),
    updatedAt: new Date(rule.updatedAt).toISOString(),
  };
}

const RuleBodySchema = z.object({
  name: z.string().min(3).max(100),
  events: z.array(AutomationEvent).min(1),
  conditions: z.array(AutomationCondition).default([]),
  actions: z.array(AutomationActionInput).min(1),
});

export const listAutomationRulesOperation = {
  operationId: "listAutomationRules",
  summary: "List a project's automation rules",
  description:
    "List the automation rules of a project, most recent first. Requires administrator access to the project.",
  tags: ["Automations"],
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: ProjectPathSchema,
    query: PageParamsSchema.extend({
      active: z
        .enum(["true", "false"])
        .optional()
        .transform((value) =>
          value === undefined ? undefined : value === "true",
        )
        .meta({
          description:
            "Restrict to rules that still fire (`true`) or to deactivated ones (`false`). Omit for both.",
        }),
    }),
  },
  responses: {
    "200": {
      description: "List of automation rules",
      content: {
        "application/json": { schema: paginated(AutomationRuleSchema) },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listAutomationRules: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/automation-rules", async (req, res) => {
    const { page, perPage, active } = req.ctx.query;
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    // Rules can name Slack channels and webhooks, so listing them is an
    // administrator's view of the project, not a reader's.
    await assertProjectAdmin({ project, user: auth.user });

    const rules = await queryAutomationRules({
      projectId: project.id,
      active,
    }).range((page - 1) * perPage, page * perPage - 1);

    res.send({
      results: rules.results.map(serializeAutomationRule),
      pageInfo: { total: rules.total, page, perPage },
    });
  });
};

export const getAutomationRuleOperation = {
  operationId: "getAutomationRule",
  summary: "Get an automation rule",
  description:
    "Retrieve a single automation rule. Requires administrator access to the project.",
  tags: ["Automations"],
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: { path: RulePathSchema },
  responses: {
    "200": {
      description: "The automation rule",
      content: { "application/json": { schema: AutomationRuleSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getAutomationRule: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/automation-rules/{ruleId}",
    async (req, res) => {
      const [project, auth] = await Promise.all([
        getProjectForAuth(req.ctx.auth(), req.ctx.params),
        req.ctx.auth(),
      ]);

      const rule = await getAutomationRuleForAdmin({
        id: req.ctx.params.ruleId,
        user: auth.user,
        projectId: project.id,
      });

      res.send(serializeAutomationRule(rule));
    },
  );
};

export const createAutomationRuleOperation = {
  operationId: "createAutomationRule",
  summary: "Create an automation rule",
  description:
    "Create an automation rule on a project. Requires administrator access to the project. Action targets must belong to the project's account.",
  tags: ["Automations"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: ProjectPathSchema },
  requestBody: {
    required: true,
    content: { "application/json": { schema: RuleBodySchema } },
  },
  responses: {
    "201": {
      description: "The created rule",
      content: { "application/json": { schema: AutomationRuleSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const createAutomationRule: CreateAPIHandler = ({ post }) => {
  post("/projects/{owner}/{project}/automation-rules", async (req, res) => {
    const [project, auth] = await Promise.all([
      getProjectForAuth(req.ctx.auth(), req.ctx.params),
      req.ctx.auth(),
    ]);

    // Shared with the GraphQL API — same admin check, same action resolution.
    const rule = await createRule({
      projectId: project.id,
      user: auth.user,
      input: req.ctx.body,
    });

    res.status(201).send(serializeAutomationRule(rule));
  });
};

export const updateAutomationRuleOperation = {
  operationId: "updateAutomationRule",
  summary: "Update an automation rule",
  description:
    "Replace an automation rule's definition. Requires administrator access to the project. The whole definition is replaced, so send the events, conditions and actions you want the rule to end up with.",
  tags: ["Automations"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: RulePathSchema },
  requestBody: {
    required: true,
    content: { "application/json": { schema: RuleBodySchema } },
  },
  responses: {
    "200": {
      description: "The updated rule",
      content: { "application/json": { schema: AutomationRuleSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const updateAutomationRule: CreateAPIHandler = ({ put }) => {
  put(
    "/projects/{owner}/{project}/automation-rules/{ruleId}",
    async (req, res) => {
      const [project, auth] = await Promise.all([
        getProjectForAuth(req.ctx.auth(), req.ctx.params),
        req.ctx.auth(),
      ]);

      const rule = await updateRule({
        id: req.ctx.params.ruleId,
        user: auth.user,
        projectId: project.id,
        input: req.ctx.body,
      });

      res.send(serializeAutomationRule(rule));
    },
  );
};

export const deactivateAutomationRuleOperation = {
  operationId: "deactivateAutomationRule",
  summary: "Deactivate an automation rule",
  description:
    "Stop a rule from firing. Rules are never deleted — a deactivated one keeps its run history, which is what tells you why something fired. Requires administrator access to the project.",
  tags: ["Automations"],
  security: patOrOAuthAuth(["projects:write"]),
  requestParams: { path: RulePathSchema },
  responses: {
    "200": {
      description: "The deactivated rule",
      content: { "application/json": { schema: AutomationRuleSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const deactivateAutomationRule: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/automation-rules/{ruleId}/deactivate",
    async (req, res) => {
      const [project, auth] = await Promise.all([
        getProjectForAuth(req.ctx.auth(), req.ctx.params),
        req.ctx.auth(),
      ]);

      const rule = await deactivateRule({
        id: req.ctx.params.ruleId,
        user: auth.user,
        projectId: project.id,
      });

      res.send(serializeAutomationRule(rule));
    },
  );
};
