import { AutomationEventSchema } from "@argos/schemas/automation-event";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import { z } from "zod";

import { testAutomation } from "@/automation";
import type { AutomationActionTypeDef } from "@/automation/actions";
import { automationAction as discordAutomationAction } from "@/automation/actions/sendDiscordMessage";
import { automationAction as msTeamsAutomationAction } from "@/automation/actions/sendMsTeamsMessage";
import { automationAction } from "@/automation/actions/sendSlackMessage";
import {
  AutomationActionRun,
  AutomationRule,
  BuildReview,
  DiscordWebhook,
  MsTeamsWebhook,
  Project,
  SlackChannel,
  type SlackInstallation,
} from "@/database/models";
import {
  getSlackChannelById,
  getSlackChannelByName,
  normalizeChannelName,
} from "@/slack/channel";

import {
  IAutomationRunStatus,
  IResolvers,
  type IAutomationActionInput,
  type ICreateAutomationRuleInput,
  type IUpdateAutomationRuleInput,
} from "../__generated__/resolver-types";
import { badUserInput, forbidden, notFound, unauthenticated } from "../util";

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
 * Extract actions from input variables.
 */
async function getActionsFromInput(args: {
  project: Project;
  input: Array<IAutomationActionInput>;
}) {
  const { project } = args;

  const SlackPayload = z.object({
    slackId: z.string().max(256, { message: "Must be 256 characters or less" }),
    name: z.string().min(1, { message: "Required" }).max(256, {
      message: "Must be 256 characters or less",
    }),
  });

  // Both webhook-based integrations reference their target the same way.
  const WebhookPayload = z.object({
    webhookId: z.string().min(1, { message: "Required" }),
  });

  // Resolved on first use: most rules use a single action kind.
  let slackInstallation: SlackInstallation | null | undefined;

  async function getSlackInstallation(): Promise<SlackInstallation> {
    if (slackInstallation === undefined) {
      await project.$fetchGraph("account.slackInstallation");
      slackInstallation = project.account?.slackInstallation ?? null;
    }
    if (!slackInstallation) {
      throw badUserInput(
        "Slack installation not found for the project account.",
      );
    }
    return slackInstallation;
  }

  const actions: AutomationActionTypeDef[] = [];

  // Iterate in input order: `then` is replayed into the form as-is, so
  // grouping by action type here would silently reorder the user's actions.
  for (const action of args.input) {
    switch (action.type) {
      case "sendMsTeamsMessage": {
        const payload = WebhookPayload.parse(action.payload);
        // Scope the lookup to the project account so a rule can't target
        // another account's webhook.
        const webhook = await MsTeamsWebhook.query().findOne({
          id: payload.webhookId,
          accountId: project.accountId,
        });

        if (!webhook) {
          throw badUserInput(
            "Microsoft Teams webhook not found for the project account.",
          );
        }

        actions.push({
          action: "sendMsTeamsMessage",
          actionPayload: { webhookId: webhook.id },
        });
        break;
      }
      case "sendDiscordMessage": {
        const payload = WebhookPayload.parse(action.payload);
        // Scope the lookup to the project account so a rule can't target
        // another account's webhook.
        const webhook = await DiscordWebhook.query().findOne({
          id: payload.webhookId,
          accountId: project.accountId,
        });

        if (!webhook) {
          throw badUserInput(
            "Discord webhook not found for the project account.",
          );
        }

        actions.push({
          action: "sendDiscordMessage",
          actionPayload: { webhookId: webhook.id },
        });
        break;
      }
      case "sendSlackMessage": {
        const payload = SlackPayload.parse(action.payload);
        const installation = await getSlackInstallation();

        // Get or create the Slack channel by name or ID (prefer ID if available)
        const slackChannel = payload.slackId
          ? await getOrCreateSlackChannelBySlackId({
              slackInstallation: installation,
              slackId: payload.slackId,
            })
          : await getOrCreateSlackChannelByName({
              slackInstallation: installation,
              name: payload.name,
            });

        if (!slackChannel) {
          throw badUserInput(
            `Slack channel "${payload.name}" not found in ${installation.teamName} workspace.`,
          );
        }

        actions.push({
          action: "sendSlackMessage",
          actionPayload: {
            channelId: slackChannel.slackId,
          },
        });
        break;
      }
      default:
        throw badUserInput(`Unknown action type: ${action.type}`);
    }
  }

  return actions;
}

/**
 * Get automation rule data from input variables.
 */
async function getAutomationRuleDataFromInput(args: {
  project: Project;
  input: ICreateAutomationRuleInput | IUpdateAutomationRuleInput;
}) {
  const { project } = args;

  validateAutomationRuleInput(args.input);

  const then = await getActionsFromInput({
    project,
    input: args.input.actions,
  });

  return AutomationRule.schema.parse({
    active: true,
    name: args.input.name,
    projectId: project.id,
    on: args.input.events,
    if: { all: args.input.conditions },
    then,
  });
}

/**
 * Get or create a Slack channel by name.
 */
async function getOrCreateSlackChannelByName(input: {
  slackInstallation: SlackInstallation;
  name: string;
}) {
  const { slackInstallation } = input;
  const name = normalizeChannelName(input.name);
  const existingSlackChannel = await SlackChannel.query().findOne({
    name,
    slackInstallationId: slackInstallation.id,
  });

  if (existingSlackChannel) {
    return existingSlackChannel;
  }

  const channel = await getSlackChannelByName({
    installation: slackInstallation,
    name,
  });

  if (!channel) {
    return null;
  }

  const slackChannel = await SlackChannel.query().insertAndFetch({
    name: channel.name,
    slackId: channel.id,
    slackInstallationId: slackInstallation.id,
  });

  return slackChannel;
}

/**
 * Get or create a Slack channel by id.
 */
async function getOrCreateSlackChannelBySlackId(input: {
  slackInstallation: SlackInstallation;
  slackId: string;
}) {
  const { slackInstallation, slackId } = input;
  const existingSlackChannel = await SlackChannel.query().findOne({
    slackId,
    slackInstallationId: slackInstallation.id,
  });

  if (existingSlackChannel) {
    return existingSlackChannel;
  }

  const channel = await getSlackChannelById({
    installation: slackInstallation,
    id: slackId,
  });

  if (!channel) {
    return null;
  }

  const slackChannel = await SlackChannel.query().insertAndFetch({
    name: channel.name,
    slackId: channel.id,
    slackInstallationId: slackInstallation.id,
  });

  return slackChannel;
}

function validateAutomationRuleInput(
  input: ICreateAutomationRuleInput | IUpdateAutomationRuleInput,
): void {
  if (input.events.length === 0) {
    throw new Error("At least one event must be selected.");
  }

  if (input.actions.length === 0) {
    throw new Error("At least one action must be specified.");
  }
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

      const automationRule = await AutomationRule.query()
        .findById(args.id)
        .withGraphFetched("project")
        .throwIfNotFound();

      invariant(automationRule.project, "Project relation not found");

      const permissions = await automationRule.project.$getPermissions(
        auth.user,
      );

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      return automationRule;
    },
  },
  Mutation: {
    createAutomationRule: async (_root, args, ctx) => {
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

      const data = await getAutomationRuleDataFromInput({
        project,
        input: args.input,
      });

      return AutomationRule.query().insertAndFetch(data);
    },
    updateAutomationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const automationRule = await AutomationRule.query()
        .findById(args.input.id)
        .withGraphFetched("project");

      if (!automationRule) {
        throw notFound("Automation rule not found.");
      }

      invariant(automationRule.project, "Project relation not found");

      const permissions = await automationRule.project.$getPermissions(
        auth.user,
      );

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      const data = await getAutomationRuleDataFromInput({
        project: automationRule.project,
        input: args.input,
      });

      return automationRule.$query().patchAndFetch(data);
    },
    deactivateAutomationRule: async (_root, { id }, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const automationRule = await AutomationRule.query()
        .findById(id)
        .withGraphFetched("project");

      if (!automationRule) {
        throw notFound("Automation rule not found.");
      }

      invariant(automationRule.project, "Project relation not found");

      const permissions = await automationRule.project.$getPermissions(
        auth.user,
      );

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      return automationRule.$query().patchAndFetch({ active: false });
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
      const actions = await getActionsFromInput({
        project,
        input: args.input.actions,
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
