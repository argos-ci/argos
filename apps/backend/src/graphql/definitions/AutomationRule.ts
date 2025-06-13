import { assertNever } from "@argos/util/assertNever";
import gqlTag from "graphql-tag";
import { isNil } from "lodash-es";

import {
  AutomationActionsName,
  getAutomationAction,
} from "@/automation/actions";
import {
  AutomationCondition,
  AutomationConditionSchema,
} from "@/automation/types/conditions";
import { AutomationEvent, AutomationEvents } from "@/automation/types/events";
import {
  AutomationRule,
  AutomationRun,
  Project,
  SlackChannel,
  SlackInstallation,
} from "@/database/models";

import {
  IAutomationAction,
  IAutomationActionInput,
  IAutomationActionSendSlackMessagePayloadInput,
  IAutomationActionType,
  IAutomationConditionInput,
  IAutomationConditions,
  IAutomationConditionType,
  IAutomationEvent,
  IAutomationRule,
  IResolvers,
} from "../__generated__/resolver-types";
import { forbidden, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum AutomationEvent {
    buildCompleted
    buildReviewed
  }

  enum AutomationConditionType {
    buildType
    buildConclusion
    buildName
  }

  type AutomationCondition {
    type: AutomationConditionType!
    value: String!
  }

  type AutomationConditions {
    all: [AutomationCondition!]!
  }

  enum AutomationActionType {
    sendSlackMessage
  }

  type AutomationActionSendSlackMessagePayload {
    channelId: String!
    slackId: String!
    name: String!
  }

  type AutomationAction {
    action: AutomationActionType!
    actionPayload: AutomationActionSendSlackMessagePayload!
  }

  type AutomationRun implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    buildId: String
    event: AutomationEvent!
  }

  type AutomationRule implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    active: Boolean!
    on: [AutomationEvent!]!
    if: AutomationConditions!
    then: [AutomationAction!]!
    lastAutomationRunDate: DateTime
  }

  type AutomationRuleConnection implements Connection {
    pageInfo: PageInfo!
    edges: [AutomationRule!]!
  }

  input AutomationConditionInput {
    type: AutomationConditionType!
    value: String!
  }

  input AutomationActionSendSlackMessagePayloadInput {
    channelId: String
    name: String!
    slackId: String!
  }

  input AutomationActionInput {
    type: AutomationActionType!
    payload: AutomationActionSendSlackMessagePayloadInput!
  }

  input CreateAutomationRuleInput {
    projectId: String!
    name: String!
    events: [AutomationEvent!]!
    conditions: [AutomationConditionInput!]!
    actions: [AutomationActionInput!]!
  }

  input UpdateAutomationRuleInput {
    id: String!
    name: String!
    events: [AutomationEvent!]!
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

const automationEventMap: Record<IAutomationEvent, AutomationEvent> = {
  [IAutomationEvent.BuildCompleted]: AutomationEvents.BuildCompleted,
  [IAutomationEvent.BuildReviewed]: AutomationEvents.BuildReviewed,
};

function parseAutomationInputs(events: IAutomationEvent[]): AutomationEvent[] {
  return events.map((event) => {
    const mapped = automationEventMap[event];
    if (!mapped) {
      throw new Error(`Unknown automation event: ${event}`);
    }
    return mapped;
  });
}

function parseConditionType(
  type: IAutomationConditionInput["type"],
): AutomationCondition["type"] {
  switch (type) {
    case "buildType":
      return "build-type";
    case "buildConclusion":
      return "build-conclusion";
    case "buildName":
      return "build-name";
    default:
      throw new Error("Unknown automation condition type: " + type);
  }
}

function parseConditionInputs(
  conditions: IAutomationConditionInput[],
): AutomationCondition[] {
  return conditions.map((condition) => {
    const type = parseConditionType(condition.type);
    return AutomationConditionSchema.parse({
      type,
      value: condition.value,
    });
  });
}

function parseActionInputs(
  actions: IAutomationActionInput[],
  slackChannels: SlackChannel[],
) {
  return actions.map((action) => {
    const { type, payload } = action;
    const actionDefinition = getAutomationAction(type as AutomationActionsName);
    if (actionDefinition.name === "sendSlackMessage") {
      const slackChannel = slackChannels.find(
        (channel) => channel.slackId === payload.slackId,
      );
      if (!slackChannel) {
        throw new Error(
          `Slack channel id "${payload.slackId}" not found for action ${type}.`,
        );
      }

      const actionPayload = { channelId: slackChannel.id };
      const result = actionDefinition.payloadSchema.safeParse(actionPayload);
      if (!result.success) {
        throw new Error(`Invalid payload for action ${type}: ${result.error}`);
      }

      return { action: actionDefinition.name, actionPayload };
    }

    assertNever(
      actionDefinition.name,
      `Unknown action type: ${actionDefinition.name}`,
    );
  });
}

const graphQLAutomationEventMap: Record<AutomationEvent, IAutomationEvent> = {
  [AutomationEvents.BuildCompleted]: IAutomationEvent.BuildCompleted,
  [AutomationEvents.BuildReviewed]: IAutomationEvent.BuildReviewed,
};

function toGraphQLAutomationEvent(event: AutomationEvent): IAutomationEvent {
  const mapped = graphQLAutomationEventMap[event];
  if (!mapped) {
    throw new Error(`Unknown automation event: ${event}`);
  }
  return mapped;
}

function toGraphQLConditionType(
  type: AutomationCondition["type"],
): IAutomationConditionType {
  switch (type) {
    case "build-type":
      return IAutomationConditionType.BuildType;
    case "build-conclusion":
      return IAutomationConditionType.BuildConclusion;
    case "build-name":
      return IAutomationConditionType.BuildName;
    default:
      assertNever(type, `Unknown condition type: ${type}`);
  }
}

function toGraphQLAutomationConditions(conditions: {
  all: AutomationCondition[];
}): IAutomationConditions {
  return {
    all: conditions.all.map((condition) => {
      const type = toGraphQLConditionType(condition.type);
      return { type, value: condition.value };
    }),
  };
}

async function toGraphQLAutomationActions(
  then: AutomationRule["then"],
): Promise<IAutomationAction[]> {
  const slackChannelIds = [
    ...new Set(
      then
        .filter(({ action }) => action === "sendSlackMessage")
        .map(({ actionPayload }) => actionPayload.channelId),
    ),
  ];
  const slackChannels =
    slackChannelIds.length > 0
      ? await SlackChannel.query().findByIds(slackChannelIds)
      : [];

  return then.map(({ action: actionName, actionPayload }) => {
    switch (actionName) {
      case "sendSlackMessage": {
        const slackChannel = slackChannels.find(
          (channel) => channel.id === actionPayload.channelId,
        );
        if (!slackChannel) {
          throw new Error(
            `Slack channel with ID ${actionPayload.channelId} not found.`,
          );
        }

        return {
          action: IAutomationActionType.SendSlackMessage,
          actionPayload: {
            channelId: actionPayload.channelId,
            slackId: slackChannel.slackId,
            name: slackChannel.name,
          },
        };
      }

      default:
        throw new Error(`Unknown action type: ${actionName}`);
    }
  });
}

async function createSlackChannels(
  slackChannelInputs: IAutomationActionSendSlackMessagePayloadInput[],
  installationId: string,
): Promise<SlackChannel[]> {
  if (slackChannelInputs.length === 0) {
    return [];
  }

  return SlackChannel.query().insertAndFetch(
    slackChannelInputs.map((input) => ({
      name: input.name,
      slackId: input.slackId,
      slackInstallationId: installationId,
    })),
  );
}

async function updateSlackChannels(
  slackChannelInputs: IAutomationActionSendSlackMessagePayloadInput[],
  installationId: string,
) {
  const channelIds = slackChannelInputs
    .map((input) => input.channelId)
    .filter((input) => !isNil(input));
  if (channelIds.length === 0) {
    return [];
  }

  const slackChannels = await SlackChannel.query()
    .where("slackInstallationId", installationId)
    .whereIn("id", channelIds);

  const slackChannelToUpdate = slackChannelInputs.filter((input) => {
    const slackChannel = slackChannels.find(
      (channel) => input.channelId && channel.id === input.channelId,
    );
    return (
      slackChannel &&
      (slackChannel.name !== input.name ||
        slackChannel.slackId !== input.slackId)
    );
  });

  const updatedSlackChannels =
    slackChannelToUpdate.length > 0
      ? await Promise.all(
          slackChannelToUpdate.map((input) =>
            SlackChannel.query().patchAndFetchById(input.channelId!, {
              name: input.name,
              slackId: input.slackId,
            }),
          ),
        )
      : [];

  return slackChannels.map((channel) => {
    const updatedChannel = updatedSlackChannels.find(
      (c) => c.id === channel.id,
    );
    return updatedChannel || channel;
  });
}

export async function toGraphQLAutomationRule(
  automationRule: AutomationRule,
): Promise<IAutomationRule> {
  const then = await toGraphQLAutomationActions(automationRule.then);
  return {
    ...automationRule,
    createdAt: new Date(automationRule.createdAt),
    updatedAt: new Date(automationRule.updatedAt),
    on: automationRule.on.map(toGraphQLAutomationEvent),
    if: toGraphQLAutomationConditions(
      automationRule.if as unknown as { all: AutomationCondition[] },
    ),
    then,
  };
}

function validAutomationRuleName(name: string): boolean {
  return name.length >= 3 && name.length <= 100;
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

      const automationRule = (await AutomationRule.query()
        .findById(args.id)
        .withGraphFetched("project")
        .throwIfNotFound()) as AutomationRule & { project: Project };

      const permissions = await automationRule.project.$getPermissions(
        auth.user,
      );
      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      return toGraphQLAutomationRule(automationRule);
    },
  },
  Mutation: {
    createAutomationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { projectId, name, events, conditions, actions } = args.input;

      const project = await Project.query()
        .findById(projectId)
        .throwIfNotFound();

      const permissions = await project.$getPermissions(auth.user);
      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      if (!validAutomationRuleName(name)) {
        throw new Error("Name must be between 3 and 100 characters long.");
      }

      if (events.length === 0) {
        throw new Error("At least one event must be selected.");
      }

      if (actions.length === 0) {
        throw new Error("At least one action must be specified.");
      }

      const slackChannelInputs = actions
        .filter((a) => a.type === IAutomationActionType.SendSlackMessage)
        .map((action) => action.payload);

      const slackChannels: SlackChannel[] = [];

      if (slackChannelInputs.length > 0) {
        const slackInstallation = await SlackInstallation.query()
          .joinRelated("account")
          .findOne({ "account.id": project.accountId })
          .throwIfNotFound();
        const newSlackChannels = await createSlackChannels(
          slackChannelInputs,
          slackInstallation.id,
        );
        slackChannels.concat(newSlackChannels);
      }

      const automationRule = await AutomationRule.query().insertAndFetch({
        active: true,
        name,
        projectId: project.id,
        on: parseAutomationInputs(events),
        if: { all: parseConditionInputs(conditions) },
        then: parseActionInputs(actions, slackChannels),
      });
      return toGraphQLAutomationRule(automationRule);
    },
    updateAutomationRule: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { id, name, events, conditions, actions } = args.input;

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

      if (!validAutomationRuleName(name)) {
        throw new Error("Name must be between 3 and 100 characters long.");
      }

      if (events.length === 0) {
        throw new Error("At least one event must be selected.");
      }

      if (actions.length === 0) {
        throw new Error("At least one action must be specified.");
      }

      const slackChannelInputs = actions
        .filter((a) => a.type === IAutomationActionType.SendSlackMessage)
        .map((action) => action.payload);

      const slackChannels: SlackChannel[] = [];

      if (slackChannelInputs.length > 0) {
        const slackInstallation = await SlackInstallation.query()
          .joinRelated("account")
          .findOne({ "account.id": automationRule.project.accountId })
          .throwIfNotFound();

        const updatedSlackChannels = await updateSlackChannels(
          slackChannelInputs.filter((input) => input.channelId),
          slackInstallation.id,
        );
        const newSlackChannels = await createSlackChannels(
          slackChannelInputs.filter((input) => !input.channelId),
          slackInstallation.id,
        );
        slackChannels.push(...updatedSlackChannels, ...newSlackChannels);
      }

      const updatedAutomationRule = await automationRule
        .$query()
        .patchAndFetch({
          name,
          on: parseAutomationInputs(events),
          if: { all: parseConditionInputs(conditions) },
          then: parseActionInputs(actions, slackChannels),
        });
      return toGraphQLAutomationRule(updatedAutomationRule);
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

      await automationRule.$query().patch({ active: false });
      return toGraphQLAutomationRule(automationRule);
    },
  },
};
