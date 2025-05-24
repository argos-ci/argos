import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { SlackChannel } from "@/database/models/index.js";
import { UnretryableError } from "@/job-core";
import { postMessageToSlackChannel } from "@/slack";
import {
  getBuildStatusMessage,
  getEventDescription,
} from "@/slack/buildStatusMessage";

import { ActionContext, registerAction } from "../actionRegistry";
import { ActionRunError } from "./util";

const SendSlackMessagePayloadSchema = z.object({
  channelId: z.string(),
});
type SendSlackMessagePayload = z.infer<typeof SendSlackMessagePayloadSchema>;

export async function processSendSlackMessageAction(
  payload: SendSlackMessagePayload,
  { automationActionRun }: ActionContext,
): Promise<void> {
  const [richActionRun, slackChannel] = await Promise.all([
    automationActionRun.$query().withGraphFetched(`
    [
      automationRun.[
        build.[
          compareScreenshotBucket,
          project
          pullRequest
        ]
        automationRule
      ],
    ]
  `),
    SlackChannel.query()
      .findById(payload.channelId)
      .withGraphFetched("slackInstallation"),
  ]);

  invariant(richActionRun, "AutomationActionRun not found", UnretryableError);
  invariant(
    richActionRun.automationRun,
    "AutomationRun not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.automationRule,
    "AutomationRule not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.build,
    "Build not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.build.project,
    "Project not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.event,
    "AutomationEvent not found",
    UnretryableError,
  );

  if (!slackChannel) {
    return ActionRunError({
      actionRunId: richActionRun.id,
      failureReason: `Slack channel removed ${payload.channelId}`,
    });
  }
  invariant(
    slackChannel.slackInstallation,
    `Slack installation not found for slack channel id ${slackChannel.id}`,
    UnretryableError,
  );

  const {
    build,
    event,
    build: { project, compareScreenshotBucket, pullRequest },
  } = richActionRun.automationRun;
  const { slackInstallation } = slackChannel;

  const buildUrl = await build.getUrl();

  const blocks = getBuildStatusMessage({
    build,
    buildUrl,
    compareScreenshotBucket,
    project,
    pullRequest,
    event,
  });

  await postMessageToSlackChannel({
    installation: slackInstallation,
    channel: slackChannel.slackId,
    text: getEventDescription(event),
    blocks,
  });

  await richActionRun.$query().patch({
    jobStatus: "complete",
    conclusion: "success",
    completedAt: new Date().toISOString(),
  });
}

registerAction({
  name: "send_slack_message",
  payloadSchema: SendSlackMessagePayloadSchema,
  process: processSendSlackMessageAction,
});
