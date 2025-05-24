import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { SlackChannel, SlackInstallation, AutomationRule as DbAutomationRule, Build as DbBuild, Project as DbProject } from "@/database/models/index.js";
import { UnretryableError } from "../../job-core";
import { postMessageToSlackChannel } from "../../slack";
import { getAutomationSlackMessageBlocks, getEventDescription } from "../../slack/buildStatusMessage";
import { ActionContext, registerAction } from "../actionRegistry";
import { AutomationActionRun as PrismaAutomationActionRun, AutomationEvent } from "@prisma/client";
import { AutomationActionRun as ObjectionAutomationActionRun } from "@/database/models";
import logger from "@/logger";


export const SendSlackMessagePayloadSchema = z.object({
  channelId: z.string(),
});

async function process(
  payload: z.infer<typeof SendSlackMessagePayloadSchema>,
  context: ActionContext
): Promise<void> {
  const baseLogContext = {
    automationActionRunId: context.automationActionRun.id,
    actionType: "send_slack_message",
    automationRunId: context.automationActionRun.automationRunId,
  };

  const objectionActionRun = context.automationActionRun as unknown as ObjectionAutomationActionRun;
  
  const richActionRun = await objectionActionRun.$query().withGraphFetched(
    "[automationRun.[build.[project, compareScreenshotBucket, pullRequest], rule]]",
  ) as ObjectionAutomationActionRun & { automationRun: { rule: DbAutomationRule, build: DbBuild & { project: DbProject }, event: AutomationEvent }};
  
  invariant(richActionRun, "AutomationActionRun not found", UnretryableError);
  invariant(richActionRun.automationRun, "AutomationRun not found", UnretryableError);
  invariant(richActionRun.automationRun.rule, "AutomationRule not found", UnretryableError);
  invariant(richActionRun.automationRun.build, "Build not found", UnretryableError);
  invariant(richActionRun.automationRun.build.project, "Project not found", UnretryableError);
  invariant(richActionRun.automationRun.event, "AutomationEvent not found", UnretryableError);

  const { channelId } = payload;
  const logContextWithChannel = { ...baseLogContext, slackChannelId: channelId };

  const { rule, build, event } = richActionRun.automationRun;
  const project = richActionRun.automationRun.build.project;

  const slackChannel = await SlackChannel.query().findById(channelId);
  if (!slackChannel) {
    logger.warn(`[sendSlackMessage] Slack channel not found.`, logContextWithChannel);
    await objectionActionRun.$query().patch({
      jobStatus: "complete",
      conclusion: "failed",
      failureReason: `Slack channel removed ${channelId}`,
      completedAt: new Date().toISOString(),
    });
    return;
  }
  logContextWithChannel.slackChannelId = slackChannel.slackId; // Use actual slack ID for subsequent logs

  const slackInstallation = await SlackInstallation.query().findById(
    slackChannel.slackInstallationId,
  );
  if (!slackInstallation) {
    logger.warn(`[sendSlackMessage] Slack installation not found for channel.`, { ...logContextWithChannel, slackInstallationId: slackChannel.slackInstallationId });
    await objectionActionRun.$query().patch({
      jobStatus: "complete",
      conclusion: "failed",
      failureReason: `Slack installation removed ${slackChannel.slackInstallationId}`,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  const projectUrl = await project.getUrl();

  const automationSlackContext = {
    rule: { name: rule.name, id: rule.id },
    event: event,
  };
  
  const blocks = getAutomationSlackMessageBlocks(
    build,
    { name: project.name, url: projectUrl },
    automationSlackContext,
  );

  const fallbackText = `Automation "${rule.name}" triggered by ${getEventDescription(event)} for build #${build.number}.`;

  logger.info("Attempting to send Slack message", logContextWithChannel);
  try {
    await postMessageToSlackChannel({
      installation: slackInstallation,
      channel: slackChannel.slackId,
      text: fallbackText,
      blocks,
    });
    logger.info("Successfully sent Slack message", logContextWithChannel);
  } catch (error) {
    logger.error("[sendSlackMessage] Error posting message to Slack", { ...logContextWithChannel, error });
    // Re-throw to let the job runner handle retries for network issues etc.
    // If it's a permanent error (e.g., channel_not_found from Slack API), it might become UnretryableError.
    throw error; 
  }

  await objectionActionRun.$query().patch({
    jobStatus: "complete",
    conclusion: "success",
    completedAt: new Date().toISOString(),
  });
}

registerAction({
  type: "send_slack_message",
  payloadSchema: SendSlackMessagePayloadSchema,
  process,
});
