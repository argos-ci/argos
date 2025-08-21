import { invariant } from "@argos/util/invariant";
import { groupBy } from "lodash-es";

import { Account, AutomationRule, SlackChannel } from "@/database/models";
import { sendNotification } from "@/notification";

/**
 * Notify owners when some rules are impacted by a Slack channel action (archived or deleted).
 */
export async function notifySlackChannelAction(
  channel: SlackChannel,
  action: "archived" | "deleted",
) {
  // Find the rules impacted
  const rules = await AutomationRule.query()
    .whereRaw(
      `EXISTS (SELECT 1
      FROM jsonb_array_elements("then") elem
      WHERE elem ->> 'action' = 'sendSlackMessage'
        AND elem -> 'actionPayload' ->> 'channelId' = ?)`,
      [channel.slackId],
    )
    .where("active", true)
    .withGraphFetched("project.account");

  // If no rules all good
  if (rules.length === 0) {
    return;
  }

  // Group rules by account
  const accountById: Record<string, Account> = {};
  const rulesByAccount = groupBy(rules, (rule) => {
    invariant(rule.project?.account, "project.account relation not loaded");
    accountById[rule.project.account.id] = rule.project.account;
    return rule.project.account.id;
  });

  // Notify owners for each impacted account
  for (const [accountId, rules] of Object.entries(rulesByAccount)) {
    const account = accountById[accountId];
    invariant(account, "Expected account to be defined");
    const ownerIds = await account.$getOwnerIds();
    await sendNotification({
      type: "slack_automation_action_unavailable",
      data: {
        action,
        automationRules: rules,
        channelId: channel.slackId,
        channelName: channel.name,
      },
      recipients: ownerIds,
    });
  }
}
