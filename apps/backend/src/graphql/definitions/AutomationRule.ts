import { AutomationEventSchema } from "@argos/schemas/automation-event";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import { z } from "zod";

import { testAutomation } from "@/automation";
import { automationAction as discordAutomationAction } from "@/automation/actions/sendDiscordMessage";
import { automationAction as msTeamsAutomationAction } from "@/automation/actions/sendMsTeamsMessage";
import { automationAction } from "@/automation/actions/sendSlackMessage";
import {
  AutomationActionRun,
  BuildReview,
  DiscordWebhook,
  MsTeamsWebhook,
  Project,
  SlackChannel,
} from "@/database/models";
import {
  AutomationActionInputSchema,
  createAutomationRule,
  deactivateAutomationRule,
  getAutomationRuleForAdmin,
  resolveAutomationActions,
  updateAutomationRule,
  type AutomationActionInput,
  type AutomationRuleInput,
} from "@/database/services/automation-rule";

import {
  IAutomationRunStatus,
  IResolvers,
  type IAutomationActionInput,
} from "../__generated__/resolver-types";
import {
  badUserInput,
  forbidden,
  notFound,
  toGraphQLError,
  unauthenticated,
} from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type AutomationConditions {
    all: [JSONObject!]!
  }

  type AutomationAction {
    action: String!
    actionPayload: JSONObject!
  }

  enum AutomationActionRunStatus {
    failed
    success
    aborted
    pending
    progress
    error
  }

  type AutomationActionRun implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    actionName: String!
    status: String!
    completedAt: DateTime
    failureReason: String
  }

  enum AutomationRunStatus {
    running
    success
    failed
  }

  type AutomationRun implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    buildId: String
    event: String!
    actionRuns: [AutomationActionRun!]!
    status: AutomationRunStatus!
  }

  type AutomationRule implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    active: Boolean!
    on: [String!]!
    if: AutomationConditions!
    then: [AutomationAction!]!
    lastAutomationRun: AutomationRun
    actionRuns: [AutomationActionRun!]!
  }

  type AutomationRuleConnection implements Connection {
    pageInfo: PageInfo!
    edges: [AutomationRule!]!
  }

  input AutomationActionInput {
    type: String!
    payload: JSONObject!
  }

  input CreateAutomationRuleInput {
    projectId: String!
    name: String!
    events: [String!]!
    conditions: [JSONObject!]!
    actions: [AutomationActionInput!]!
  }

  input UpdateAutomationRuleInput {
    id: String!
    name: String!
    events: [String!]!
    conditions: [JSONObject!]!
    actions: [AutomationActionInput!]!
  }

  input TestAutomationRuleInput {
    projectId: String!
    event: String!
    actions: [AutomationActionInput!]!
  }

  extend type Query {
    "Get automation rule by ID"
    automationRule(id: String!): AutomationRule
  }

  extend type Mutation {
    "Create automation"
    createAutomationRule(input: CreateAutomationRuleInput!): AutomationRule!
    "Update automation"
    updateAutomationRule(input: UpdateAutomationRuleInput!): AutomationRule!
    "Deactivate automation"
    deactivateAutomationRule(id: String!): AutomationRule!
    "Test automation rule by sending a test event"
    testAutomation(input: TestAutomationRuleInput!): Boolean!
  }
`;

/**
 * Parse the loosely-typed GraphQL action inputs (`payload` is a `JSONObject`)
 * into the shape the shared service accepts. The REST API declares the same
 * schema in its request body, so both reject the same malformed payloads.
 */
function parseAutomationActions(
  input: readonly IAutomationActionInput[],
): AutomationActionInput[] {
  const parsed = z.array(AutomationActionInputSchema).safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw badUserInput(issue?.message ?? "Invalid automation action.", {
      field: issue ? `actions.${issue.path.join(".")}` : "actions",
    });
  }
  return parsed.data;
}

/** Parse a rule definition coming from the GraphQL layer. */
function parseAutomationRuleInput(input: {
  name: string;
  events: string[];
  conditions: unknown[];
  actions: readonly IAutomationActionInput[];
}): AutomationRuleInput {
  const events = z.array(AutomationEventSchema).safeParse(input.events);
  if (!events.success) {
    throw badUserInput("Invalid automation event.", { field: "events" });
  }
  return {
    name: input.name,
    events: events.data,
    conditions: input.conditions,
    actions: parseAutomationActions(input.actions),
  };
}

function getAutomationActionRunStatus(
  AutomationActionRun: AutomationActionRun,
) {
  if (AutomationActionRun.jobStatus === "complete") {
    if (!AutomationActionRun.conclusion) {
      throw new Error(
        "AutomationActionRun conclusion is missing, this should not happen.",
      );
    }

    return AutomationActionRun.conclusion;
  }

  return AutomationActionRun.jobStatus;
}

function getAutomationRunStatus(
  actionRuns: AutomationActionRun[],
): IAutomationRunStatus {
  const statuses = actionRuns.map(getAutomationActionRunStatus);

  if (
    statuses.some((status) => status === "pending" || status === "progress")
  ) {
    return IAutomationRunStatus.Running;
  }

  if (
    statuses.some(
      (status) =>
        status === "aborted" || status === "error" || status === "failed",
    )
  ) {
    return IAutomationRunStatus.Failed;
  }

  if (statuses.every((status) => status === "success")) {
    return IAutomationRunStatus.Success;
  }

  throw new Error("Unknown status for automation run");
}

export const resolvers: IResolvers = {
  AutomationActionRun: {
    actionName: (automationActionRun) => {
      return automationActionRun.action;
    },
    status: (automationActionRun) => {
      return getAutomationActionRunStatus(automationActionRun);
    },
  },
  AutomationRun: {
    actionRuns: async (automationRun, _args, ctx) => {
      return ctx.loaders.AutomationRunActionRuns.load(automationRun.id);
    },
    status: async (automationRun, _args, ctx) => {
      const actionRuns = await ctx.loaders.AutomationRunActionRuns.load(
        automationRun.id,
      );
      return getAutomationRunStatus(actionRuns);
    },
  },
  AutomationRule: {
    lastAutomationRun: async (automationRule, _args, ctx) => {
      return ctx.loaders.LatestAutomationRun.load(automationRule.id);
    },
    actionRuns: async (automationRule) => {
      return AutomationActionRun.query()
        .joinRelated("automationRun.automationRule")
        .where("automationRun.automationRuleId", automationRule.id)
        .limit(20)
        .orderBy("createdAt", "desc");
    },
  },
  AutomationAction: {
    actionPayload: async (action) => {
      switch (action.action) {
        case "sendSlackMessage": {
          const payload = automationAction.payloadSchema.parse(
            action.actionPayload,
          );
          const slackChannel = await SlackChannel.query().findOne({
            slackId: payload.channelId,
          });
          if (!slackChannel) {
            return {
              slackId: "",
              name: "deleted",
            };
          }
          return {
            slackId: slackChannel.slackId,
            name: slackChannel.name,
          };
        }
        case "sendMsTeamsMessage": {
          const payload = msTeamsAutomationAction.payloadSchema.parse(
            action.actionPayload,
          );
          const webhook = await MsTeamsWebhook.query().findById(
            payload.webhookId,
          );
          if (!webhook) {
            // Keep the dangling id: the form schema requires a non-empty
            // `webhookId`, so blanking it here would make the edit page throw
            // and leave the rule unrepairable from the UI.
            return { webhookId: payload.webhookId, name: "deleted" };
          }
          return { webhookId: webhook.id, name: webhook.name };
        }
        case "sendDiscordMessage": {
          const payload = discordAutomationAction.payloadSchema.parse(
            action.actionPayload,
          );
          const webhook = await DiscordWebhook.query().findById(
            payload.webhookId,
          );
          if (!webhook) {
            // Keep the dangling id: the form schema requires a non-empty
            // `webhookId`, so blanking it here would make the edit page throw
            // and leave the rule unrepairable from the UI.
            return { webhookId: payload.webhookId, name: "deleted" };
          }
          return { webhookId: webhook.id, name: webhook.name };
        }
        default: {
          throw new Error(`Unknown action: ${action.action}`);
        }
      }
    },
  },
  Query: {
    automationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      try {
        // Shared with the REST API — same admin check.
        return await getAutomationRuleForAdmin({
          id: args.id,
          user: auth.user,
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
  },
  Mutation: {
    createAutomationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      try {
        // Shared with the REST API — same admin check, same action resolution.
        return await createAutomationRule({
          projectId: args.input.projectId,
          user: auth.user,
          input: parseAutomationRuleInput(args.input),
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    updateAutomationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      try {
        return await updateAutomationRule({
          id: args.input.id,
          user: auth.user,
          input: parseAutomationRuleInput(args.input),
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    deactivateAutomationRule: async (_root, { id }, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      try {
        return await deactivateAutomationRule({ id, user: auth.user });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    testAutomation: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { projectId } = args.input;

      const project = await Project.query().findById(projectId);

      if (!project) {
        throw notFound("Project not found.");
      }

      const permissions = await project.$getPermissions(auth.user);

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      const automationEvent = AutomationEventSchema.parse(args.input.event);
      // Shared with the REST API — same target resolution and scoping.
      const actions = await resolveAutomationActions({
        project,
        input: parseAutomationActions(args.input.actions),
      });

      switch (automationEvent) {
        case "build.completed": {
          const lastBuild = await project
            .$relatedQuery("builds")
            .withGraphFetched("compareScreenshotBucket")
            .orderBy("id", "desc")
            .first();

          if (!lastBuild) {
            throw notFound(
              "The project must have at least one build to test this automation.",
            );
          }
          invariant(
            lastBuild.compareScreenshotBucket,
            "compareScreenshotBucket relation not found",
          );

          await testAutomation({
            actions,
            message: {
              event: automationEvent,
              payload: {
                build: lastBuild,
                compareScreenshotBucket: lastBuild.compareScreenshotBucket,
              },
            },
          });
          return true;
        }
        case "build.reviewed": {
          const lastBuildReview = await BuildReview.query()
            .joinRelated("build")
            .withGraphFetched("build.compareScreenshotBucket")
            .where("build.projectId", project.id)
            .orderBy("build_reviews.createdAt", "desc")
            .first();

          if (!lastBuildReview) {
            throw notFound(
              "The project must have at least one build review to test this automation.",
            );
          }

          invariant(lastBuildReview.build, "build relation not found");
          invariant(
            lastBuildReview.build.compareScreenshotBucket,
            "compareScreenshotBucket relation not found",
          );

          await testAutomation({
            actions,
            message: {
              event: automationEvent,
              payload: {
                build: lastBuildReview.build,
                compareScreenshotBucket:
                  lastBuildReview.build.compareScreenshotBucket,
                buildReview: lastBuildReview,
              },
            },
          });
          return true;
        }
        default:
          assertNever(automationEvent, `Unknown event: ${automationEvent}`);
      }
    },
  },
};
