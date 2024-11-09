import { invariant } from "@argos/util/invariant";

import { AutomationActionRun } from "@/database/models";
import { SlackChannel, SlackInstallation } from "@/database/models/index.js";

import { UnretryableError } from "../../job-core";
import { postMessageToSlackChannel } from "../../slack";
import { getBuildStatusMessage } from "../../slack/buildStatusMessage";

type PostInSlackChannelPayload = {
  channelId: string;
};

export type PostInSlackChannelAction = {
  type: "send_slack_message";
  payload: PostInSlackChannelPayload;
};

export async function processSendSlackMessageAction(
  ActionRun: AutomationActionRun,
) {
  const richActionRun = await ActionRun.$query().withGraphFetched(
    "[automationRun.build.[compareScreenshotBucket, project]]",
  );
  const payload = richActionRun.actionPayload;
  invariant(
    "channelId" in payload && payload.channelId,
    `Missing channelId in PostInSlackChannelPayload for ActionRun ${richActionRun.id}`,
    UnretryableError,
  );

  const slackChannel = await SlackChannel.query().findById(payload.channelId);
  if (!slackChannel) {
    await richActionRun.$query().patch({
      jobStatus: "complete",
      conclusion: "failed",
      failureReason: `Slack channel removed ${payload.channelId}`,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  const slackInstallation = await SlackInstallation.query().findById(
    slackChannel.slackInstallationId,
  );
  if (!slackInstallation) {
    await richActionRun.$query().patch({
      jobStatus: "complete",
      conclusion: "failed",
      failureReason: `Slack installation removed ${slackChannel.slackInstallationId}`,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  const build = richActionRun.automationRun?.build;
  invariant(build, "No build found", UnretryableError);
  invariant(build?.project, "No project found", UnretryableError);

  const event = richActionRun.automationRun?.event;
  invariant(event, "No event found", UnretryableError);

  const projectUrl = await build.project.getUrl();
  const blocks = getBuildStatusMessage(
    build,
    { name: build.project.name, url: projectUrl },
    { description: event },
  );
  await postMessageToSlackChannel({
    installation: slackInstallation,
    channel: slackChannel.slackId,
    text: event,
    blocks,
  });

  await richActionRun.$query().patch({
    jobStatus: "complete",
    conclusion: "success",
    completedAt: new Date().toISOString(),
  });
}
