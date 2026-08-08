/**
 * Automation rules: the "when this happens, do that" rules attached to a
 * project.
 *
 * Shared by the GraphQL API (`automationRule`, `createAutomationRule`,
 * `updateAutomationRule`, `deactivateAutomationRule`, `testAutomation`) and the
 * public REST API so both resolve action targets the same way and enforce the
 * same authorization.
 *
 * An action's *input* names its target the way a human would — a Slack channel
 * by id or name, a webhook by id — and this module resolves it to what the
 * runner needs, refusing anything belonging to another account.
 */
import type { AutomationEvent } from "@argos/schemas/automation-event";
import { invariant } from "@argos/util/invariant";
import type { QueryBuilder } from "objection";
import { z } from "zod";

import type { AutomationActionTypeDef } from "@/automation/actions";
import {
  getSlackChannelById,
  getSlackChannelByName,
  normalizeChannelName,
} from "@/slack/channel";
import { boom } from "@/util/error";

import { AutomationRule } from "../models/AutomationRule";
import { DiscordWebhook } from "../models/DiscordWebhook";
import { MsTeamsWebhook } from "../models/MsTeamsWebhook";
import type { Project } from "../models/Project";
import { SlackChannel } from "../models/SlackChannel";
import type { SlackInstallation } from "../models/SlackInstallation";
import type { User } from "../models/User";
import { isValidPgBigInt } from "../util/biginteger";
import { assertProjectAdmin, loadProjectById } from "./project";

/** How an action names its target before the service resolves it. */
export const AutomationActionInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sendSlackMessage"),
    payload: z.object({
      slackId: z
        .string()
        .max(256, { message: "Must be 256 characters or less" })
        .optional()
        .default(""),
      name: z
        .string()
        .min(1, { message: "Required" })
        .max(256, { message: "Must be 256 characters or less" }),
    }),
  }),
  z.object({
    type: z.literal("sendMsTeamsMessage"),
    payload: z.object({
      webhookId: z.string().min(1, { message: "Required" }),
    }),
  }),
  z.object({
    type: z.literal("sendDiscordMessage"),
    payload: z.object({
      webhookId: z.string().min(1, { message: "Required" }),
    }),
  }),
]);

export type AutomationActionInput = z.infer<typeof AutomationActionInputSchema>;

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

  return SlackChannel.query().insertAndFetch({
    name: channel.name,
    slackId: channel.id,
    slackInstallationId: slackInstallation.id,
  });
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

  return SlackChannel.query().insertAndFetch({
    name: channel.name,
    slackId: channel.id,
    slackInstallationId: slackInstallation.id,
  });
}

/**
 * Resolve the action inputs into the payloads the runner executes.
 *
 * Every lookup is scoped to the project's account, so a rule can never be
 * pointed at another account's webhook or Slack workspace.
 */
export async function resolveAutomationActions(args: {
  project: Project;
  input: AutomationActionInput[];
}): Promise<AutomationActionTypeDef[]> {
  const { project } = args;

  // Resolved on first use: most rules use a single action kind.
  let slackInstallation: SlackInstallation | null | undefined;

  async function getSlackInstallation(): Promise<SlackInstallation> {
    if (slackInstallation === undefined) {
      await project.$fetchGraph("account.slackInstallation");
      slackInstallation = project.account?.slackInstallation ?? null;
    }
    if (!slackInstallation) {
      throw boom(400, "Slack installation not found for the project account.");
    }
    return slackInstallation;
  }

  const actions: AutomationActionTypeDef[] = [];

  // Iterate in input order: `then` is replayed into the form as-is, so
  // grouping by action type here would silently reorder the user's actions.
  for (const action of args.input) {
    switch (action.type) {
      case "sendMsTeamsMessage": {
        const webhook = await MsTeamsWebhook.query().findOne({
          id: action.payload.webhookId,
          accountId: project.accountId,
        });

        if (!webhook) {
          throw boom(
            400,
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
        const webhook = await DiscordWebhook.query().findOne({
          id: action.payload.webhookId,
          accountId: project.accountId,
        });

        if (!webhook) {
          throw boom(400, "Discord webhook not found for the project account.");
        }

        actions.push({
          action: "sendDiscordMessage",
          actionPayload: { webhookId: webhook.id },
        });
        break;
      }
      case "sendSlackMessage": {
        const installation = await getSlackInstallation();

        // Prefer the id when the caller has one; a name is what a human types.
        const slackChannel = action.payload.slackId
          ? await getOrCreateSlackChannelBySlackId({
              slackInstallation: installation,
              slackId: action.payload.slackId,
            })
          : await getOrCreateSlackChannelByName({
              slackInstallation: installation,
              name: action.payload.name,
            });

        if (!slackChannel) {
          throw boom(
            400,
            `Slack channel "${action.payload.name}" not found in ${installation.teamName} workspace.`,
          );
        }

        actions.push({
          action: "sendSlackMessage",
          actionPayload: { channelId: slackChannel.slackId },
        });
        break;
      }
    }
  }

  return actions;
}

/** The definition of a rule, as a caller supplies it. */
export type AutomationRuleInput = {
  name: string;
  events: AutomationEvent[];
  conditions: unknown[];
  actions: AutomationActionInput[];
};

/**
 * Turn a rule definition into the row to persist, resolving its actions and
 * validating the whole thing against the model schema.
 */
async function buildAutomationRuleData(args: {
  project: Project;
  input: AutomationRuleInput;
}) {
  const { project, input } = args;

  if (input.events.length === 0) {
    throw boom(400, "At least one event must be selected.", {
      field: "events",
    });
  }

  if (input.actions.length === 0) {
    throw boom(400, "At least one action must be specified.", {
      field: "actions",
    });
  }

  const then = await resolveAutomationActions({
    project,
    input: input.actions,
  });

  const parsed = AutomationRule.schema.safeParse({
    active: true,
    name: input.name,
    projectId: project.id,
    on: input.events,
    if: { all: input.conditions },
    then,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw boom(400, issue?.message ?? "Invalid automation rule.", {
      field: issue?.path.join("."),
    });
  }

  return parsed.data;
}

/**
 * Build the query listing a project's automation rules, most recent first.
 * Callers paginate.
 */
export function queryAutomationRules(args: {
  projectId: string;
  /** Restrict to active (`true`) or deactivated (`false`) rules. */
  active?: boolean | null | undefined;
}): QueryBuilder<AutomationRule, AutomationRule[]> {
  const query = AutomationRule.query()
    .where("projectId", args.projectId)
    .orderBy("id", "desc");
  if (typeof args.active === "boolean") {
    query.where("active", args.active);
  }
  return query;
}

/**
 * Load a rule and assert the user administers the project it belongs to.
 */
export async function getAutomationRuleForAdmin(args: {
  id: string;
  user: User;
  /** When set, the rule must belong to this project. */
  projectId?: string;
}): Promise<AutomationRule> {
  // The id reaches us from a URL path or a GraphQL argument, and the column is
  // a bigint: handing Postgres a non-numeric one raises a cast error, which the
  // API surfaces as a 500 carrying the query text. A malformed id is simply a
  // rule that does not exist.
  if (!isValidPgBigInt(args.id)) {
    throw boom(404, "Automation rule not found.");
  }

  const automationRule = await AutomationRule.query()
    .findById(args.id)
    .withGraphFetched("project");

  // A rule addressed through the wrong project is indistinguishable from one
  // that does not exist.
  if (
    !automationRule?.project ||
    (args.projectId && automationRule.projectId !== args.projectId)
  ) {
    throw boom(404, "Automation rule not found.");
  }

  await assertProjectAdmin({
    project: automationRule.project,
    user: args.user,
  });

  return automationRule;
}

export async function createAutomationRule(args: {
  projectId: string;
  user: User;
  input: AutomationRuleInput;
}): Promise<AutomationRule> {
  const project = await loadProjectById(args.projectId);
  await assertProjectAdmin({ project, user: args.user });
  const data = await buildAutomationRuleData({ project, input: args.input });
  return AutomationRule.query().insertAndFetch(data);
}

export async function updateAutomationRule(args: {
  id: string;
  user: User;
  projectId?: string;
  input: AutomationRuleInput;
}): Promise<AutomationRule> {
  const automationRule = await getAutomationRuleForAdmin(args);
  const { project } = automationRule;
  // `getAutomationRuleForAdmin` fetched it to check permissions.
  invariant(project, "automation rule project not fetched");
  const data = await buildAutomationRuleData({
    project,
    input: args.input,
  });
  return automationRule.$query().patchAndFetch(data);
}

/**
 * Deactivate a rule. Rules are never deleted — a deactivated one keeps its run
 * history, which is what tells you why something fired last week.
 */
export async function deactivateAutomationRule(args: {
  id: string;
  user: User;
  projectId?: string;
}): Promise<AutomationRule> {
  const automationRule = await getAutomationRuleForAdmin(args);
  return automationRule.$query().patchAndFetch({ active: false });
}
