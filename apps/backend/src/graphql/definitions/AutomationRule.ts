import { invariant } from "@argos/util/invariant";
import { omitUndefinedValues } from "@argos/util/omitUndefinedValues";
import gqlTag from "graphql-tag";

import {
  AutomationRule,
  AutomationRuleSchema,
  AutomationRun,
  Project,
} from "@/database/models";

import {
  IResolvers,
  type ICreateAutomationRuleInput,
  type IUpdateAutomationRuleInput,
} from "../__generated__/resolver-types";
import { forbidden, unauthenticated } from "../util";

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
  }
`;

// async function createSlackChannels(
//   slackChannelInputs: IAutomationActionSendSlackMessagePayloadInput[],
//   installationId: string,
// ): Promise<SlackChannel[]> {
//   if (slackChannelInputs.length === 0) {
//     return [];
//   }

//   return SlackChannel.query().insertAndFetch(
//     slackChannelInputs.map((input) => ({
//       name: input.name,
//       slackId: input.slackId,
//       slackInstallationId: installationId,
//     })),
//   );
// }

// async function updateSlackChannels(
//   slackChannelInputs: IAutomationActionSendSlackMessagePayloadInput[],
//   installationId: string,
// ) {
//   const channelIds = slackChannelInputs
//     .map((input) => input.channelId)
//     .filter((input) => !isNil(input));
//   if (channelIds.length === 0) {
//     return [];
//   }

//   const slackChannels = await SlackChannel.query()
//     .where("slackInstallationId", installationId)
//     .whereIn("id", channelIds);

//   const slackChannelToUpdate = slackChannelInputs.filter((input) => {
//     const slackChannel = slackChannels.find(
//       (channel) => input.channelId && channel.id === input.channelId,
//     );
//     return (
//       slackChannel &&
//       (slackChannel.name !== input.name ||
//         slackChannel.slackId !== input.slackId)
//     );
//   });

//   const updatedSlackChannels =
//     slackChannelToUpdate.length > 0
//       ? await Promise.all(
//           slackChannelToUpdate.map((input) =>
//             SlackChannel.query().patchAndFetchById(input.channelId!, {
//               name: input.name,
//               slackId: input.slackId,
//             }),
//           ),
//         )
//       : [];

//   return slackChannels.map((channel) => {
//     const updatedChannel = updatedSlackChannels.find(
//       (c) => c.id === channel.id,
//     );
//     return updatedChannel || channel;
//   });
// }

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

      invariant(automationRule.project);

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

      const { projectId, name, events, conditions } = args.input;

      const project = await Project.query()
        .findById(projectId)
        .throwIfNotFound();

      const permissions = await project.$getPermissions(auth.user);

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      validateAutomationRuleInput(args.input);

      // const slackChannelInputs = actions
      //   .filter((a) => a.type === IAutomationActionType.SendSlackMessage)
      //   .map((action) => action.payload);

      // const slackChannels: SlackChannel[] = [];

      // if (slackChannelInputs.length > 0) {
      //   const slackInstallation = await SlackInstallation.query()
      //     .joinRelated("account")
      //     .findOne({ "account.id": project.accountId })
      //     .throwIfNotFound();

      //   const newSlackChannels = await createSlackChannels(
      //     slackChannelInputs,
      //     slackInstallation.id,
      //   );

      //   slackChannels.push(...newSlackChannels);
      // }

      return AutomationRule.query().insertAndFetch(
        AutomationRuleSchema.parse({
          active: true,
          name,
          projectId: project.id,
          on: events,
          if: { all: conditions },
          then: [], // parseActionInputs(actions, slackChannels),
        }),
      );
    },
    updateAutomationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { id, name, events, conditions } = args.input;

      const automationRule = await AutomationRule.query()
        .findById(id)
        .withGraphFetched("project")
        .throwIfNotFound();

      invariant(automationRule.project);

      const permissions = await automationRule.project.$getPermissions(
        auth.user,
      );

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      validateAutomationRuleInput(args.input);

      // const slackChannelInputs = actions
      //   .filter((a) => a.type === "sendSlackMessage")
      //   .map((action) => action.payload);

      // const slackChannels: SlackChannel[] = [];

      // if (slackChannelInputs.length > 0) {
      //   const slackInstallation = await SlackInstallation.query()
      //     .joinRelated("account")
      //     .findOne({ "account.id": automationRule.project.accountId })
      //     .throwIfNotFound();

      //   const updatedSlackChannels = await updateSlackChannels(
      //     slackChannelInputs.filter((input) => input.channelId),
      //     slackInstallation.id,
      //   );
      //   const newSlackChannels = await createSlackChannels(
      //     slackChannelInputs.filter((input) => !input.channelId),
      //     slackInstallation.id,
      //   );
      //   slackChannels.push(...updatedSlackChannels, ...newSlackChannels);
      // }

      const data = AutomationRuleSchema.partial().parse({
        name,
        on: events,
        if: { all: conditions },
        then: [], // parseActionInputs(actions, slackChannels),
      });

      return automationRule.$query().patchAndFetch(omitUndefinedValues(data));
    },
    deactivateAutomationRule: async (_root, { id }, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const automationRule = (await AutomationRule.query()
        .findById(id)
        .withGraphFetched("project")
        .throwIfNotFound()) as AutomationRule & { project: Project };

      const permissions = await automationRule.project.$getPermissions(
        auth.user,
      );

      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      return automationRule.$query().patchAndFetch({ active: false });
    },
  },
};
