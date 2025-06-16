import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import { z } from "zod";

import { testAutomation } from "@/automation";
import type { AutomationActionType } from "@/automation/actions";
import { AutomationEventSchema } from "@/automation/types/events";
import {
  AutomationRule,
  AutomationRun,
  BuildReview,
  Project,
  SlackChannel,
  type SlackInstallation,
} from "@/database/models";
import {
  getSlackChannelById,
  getSlackChannelByName,
  normalizeChannelName,
} from "@/slack";

import {
  IResolvers,
  type IAutomationActionInput,
  type ICreateAutomationRuleInput,
  type IUpdateAutomationRuleInput,
} from "../__generated__/resolver-types";
import { badUserInput, forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type AutomationCondition {
    type: String!
    value: String!
  }

  type AutomationConditions {
    all: [AutomationCondition!]!
  }

  type AutomationActionSendSlackMessagePayload {
    channelId: String!
    slackId: String!
    name: String!
  }

  type AutomationAction {
    action: String!
    actionPayload: JSONObject!
  }

  type AutomationRun implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    buildId: String
    event: String!
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
    lastAutomationRunDate: DateTime
  }

  type AutomationRuleConnection implements Connection {
    pageInfo: PageInfo!
    edges: [AutomationRule!]!
  }

  input AutomationConditionInput {
    type: String!
    value: String!
  }

  input AutomationActionInput {
    type: String!
    payload: JSONObject!
  }

  input CreateAutomationRuleInput {
    projectId: String!
    name: String!
    events: [String!]!
    conditions: [AutomationConditionInput!]!
    actions: [AutomationActionInput!]!
  }

  input UpdateAutomationRuleInput {
    id: String!
    name: String!
    events: [String!]!
    conditions: [AutomationConditionInput!]!
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
  const slackChannelActionPayloads = args.input
    .filter((a) => a.type === "sendSlackMessage")
    .map((action) =>
      z
        .object({
          slackId: z
            .string()
            .max(256, { message: "Must be 256 characters or less" }),
          name: z.string().min(1, { message: "Required" }).max(21, {
            message: "Must be 21 characters or less",
          }),
        })
        .parse(action.payload),
    );

  const actions: AutomationActionType[] = [];

  if (slackChannelActionPayloads.length > 0) {
    await project.$fetchGraph("account.slackInstallation");

    const slackInstallation = project.account?.slackInstallation;

    if (!slackInstallation) {
      throw badUserInput(
        "Slack installation not found for the project account.",
      );
    }

    for (const payload of slackChannelActionPayloads) {
      // Get or create the Slack channel by name or ID (prefer ID if available)
      const slackChannel = payload.slackId
        ? await getOrCreateSlackChannelBySlackId({
            slackInstallation,
            slackId: payload.slackId,
          })
        : await getOrCreateSlackChannelByName({
            slackInstallation,
            name: payload.name,
          });

      if (!slackChannel) {
        throw badUserInput(
          `Slack channel "${payload.name}" not found in ${slackInstallation.teamName} workspace.`,
        );
      }

      actions.push({
        action: "sendSlackMessage",
        actionPayload: {
          channelId: slackChannel.id,
        },
      });
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

export const resolvers: IResolvers = {
  AutomationRule: {
    lastAutomationRunDate: async (automationRule) => {
      const lastRun = await AutomationRun.query()
        .findOne({ automationRuleId: automationRule.id })
        .orderBy("createdAt", "desc");
      return lastRun ? new Date(lastRun.createdAt) : null;
    },
  },
  AutomationAction: {
    actionPayload: async (action) => {
      switch (action.action) {
        case "sendSlackMessage": {
          const slackChannel = await SlackChannel.query().findById(
            action.actionPayload.channelId,
          );
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
            .orderBy("id", "desc")
            .first();

          if (!lastBuild) {
            throw notFound(
              "The project must have at least one build to test this automation.",
            );
          }

          await testAutomation({
            event: automationEvent,
            actions,
            payload: {
              build: lastBuild,
            },
          });
          return true;
        }
        case "build.reviewed": {
          const lastBuildReview = await BuildReview.query()
            .joinRelated("build")
            .withGraphFetched("build")
            .where("build.projectId", project.id)
            .orderBy("build_reviews.createdAt", "desc")
            .first();

          if (!lastBuildReview) {
            throw notFound(
              "The project must have at least one build review to test this automation.",
            );
          }

          invariant(lastBuildReview.build, "build relation not found");

          await testAutomation({
            event: automationEvent,
            actions,
            payload: {
              build: lastBuildReview.build,
              buildReview: lastBuildReview,
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
