import * as React from "react";
import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../email-components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "slack_automation_action_unavailable",
  schema: z.object({
    channelId: z.string(),
    channelName: z.string(),
    action: z.enum(["archived", "deleted"]),
    automationRules: z.array(
      z.object({
        name: z.string(),
        href: z.url(),
      }),
    ),
  }),
  previewData: {
    channelId: "C0888DXZVRR",
    channelName: "general",
    action: "archived",
    automationRules: [
      {
        name: "Notify when a build has changes",
        href: "https://app.argos-ci.com/acme/proj/automations/2",
      },
    ],
  },
  email: (props) => {
    const { channelId, channelName, action, automationRules, ctx } = props;
    return {
      subject: `[Action required] Slack channel #${channelName} used in automation has been ${action}`,
      body: (
        <EmailLayout
          preview={`The Slack channel ${channelName} (ID: ${channelId}) used in some automation rules has been ${action}.`}
        >
          <H1>Automation rule update required</H1>
          <Hi ctx={ctx} />
          <Paragraph>
            The Slack channel <strong>#{channelName}</strong> (ID: {channelId})
            linked to the following automation rules are no longer available
            because the channel has been <strong>{action}</strong>:
          </Paragraph>
          <ul>
            {automationRules.map((rule) => (
              <li key={rule.href}>
                <Link href={rule.href}>{rule.name}</Link>
              </li>
            ))}
          </ul>
          <Paragraph>
            To keep receiving notifications, please update these automation
            rules with an active Slack channel.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
