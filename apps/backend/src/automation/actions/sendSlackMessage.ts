import { invariant } from "@argos/util/invariant";
import { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import { Build, SlackChannel } from "@/database/models/index.js";
import { postMessageToSlackChannel } from "@/slack";
import {
  getBuildStatusMessage,
  getEventDescription,
} from "@/slack/buildStatusMessage";

import { AutomationActionFailureError } from "../automationActionError";
import {
  AutomationActionContext,
  defineAutomationAction,
} from "../defineAutomationAction";

const payloadSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});
type payload = z.infer<typeof payloadSchema>;

const payloadJsonSchema = zodToJsonSchema(payloadSchema, {
  removeAdditionalStrategy: "strict",
}) as JSONSchema;

export async function sendSlackMessage(
  props: payload & { ctx: AutomationActionContext },
): Promise<void> {
  const { channelId, ctx } = props;
  const { automationActionRun } = ctx;

  const [richActionRun, slackChannel] = await Promise.all([
    automationActionRun.$query().withGraphFetched(`
    [
      automationRun.[
        build.[
          compareScreenshotBucket,
          project.[
            githubRepository.[
              githubAccount
            ]
            gitlabProject
          ]
          pullRequest.[
            githubRepository.[
              githubAccount
            ]
          ]
        ]
        automationRule
      ],
    ]
  `),
    SlackChannel.query()
      .findById(channelId)
      .withGraphFetched("slackInstallation"),
  ]);

  if (!richActionRun) {
    throw new AutomationActionFailureError(
      `AutomationActionRun not found with id: '${automationActionRun.id}'`,
    );
  }
  if (!richActionRun) {
    throw new AutomationActionFailureError(
      `AutomationRun related to automationActionRun ${automationActionRun.id} not found`,
    );
  }
  if (!richActionRun.automationRun) {
    throw new AutomationActionFailureError(
      `AutomationRule related to automationActionRun ${automationActionRun.id} not found`,
    );
  }
  if (!richActionRun.automationRun.build) {
    throw new AutomationActionFailureError(
      `Build related to automationActionRun ${automationActionRun.id} not found`,
    );
  }
  if (!richActionRun.automationRun.build.project) {
    throw new AutomationActionFailureError(
      `Project related to automationActionRun ${automationActionRun.id} not found`,
    );
  }
  if (!richActionRun.automationRun.event) {
    throw new AutomationActionFailureError(
      `AutomationEvent related to automationActionRun ${automationActionRun.id} not found`,
    );
  }
  if (!slackChannel) {
    throw new AutomationActionFailureError(
      `Slack channel removed ${channelId}`,
    );
  }
  if (!slackChannel.slackInstallation) {
    throw new AutomationActionFailureError(
      `Slack installation not found for slack channel id ${slackChannel.id}`,
    );
  }

  const {
    build,
    event,
    build: { project, compareScreenshotBucket, pullRequest },
  } = richActionRun.automationRun;

  const [buildUrl, [status]] = await Promise.all([
    build.getUrl(),
    Build.getAggregatedBuildStatuses([build]),
  ]);

  invariant(status, "Status should be loaded");

  const blocks = getBuildStatusMessage({
    build,
    buildUrl,
    compareScreenshotBucket,
    project,
    pullRequest,
    status,
  });

  await postMessageToSlackChannel({
    installation: slackChannel.slackInstallation,
    channel: slackChannel.slackId,
    text: getEventDescription(event),
    blocks,
  });
}

export const automationAction = defineAutomationAction({
  name: "sendSlackMessage",
  payloadSchema,
  payloadJsonSchema,
  process: sendSlackMessage,
});
