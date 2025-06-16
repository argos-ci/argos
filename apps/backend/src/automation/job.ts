import { invariant } from "@argos/util/invariant";

import { AutomationActionRun } from "@/database/models/index.js";
import { createModelJob, UnretryableError } from "@/job-core/index.js";

import { getAutomationAction } from "./actions";
import { AutomationActionFailureError } from "./automationActionError";

export async function processAutomationActionRun(
  automationActionRun: AutomationActionRun,
): Promise<void> {
  // Get the action
  const actionDefinition = getAutomationAction(automationActionRun.action);

  // Validate the payload schema
  const {
    success: parsingSuccess,
    error: parsingError,
    data: validatedPayload,
  } = actionDefinition.payloadSchema.safeParse(
    automationActionRun.actionPayload,
  );

  invariant(
    parsingSuccess,
    `Invalid payload for action ${automationActionRun.action}: ${parsingError}`,
    UnretryableError,
  );

  // Process the action and update the conclusion status
  try {
    await actionDefinition.process({
      payload: validatedPayload,
      ctx: { automationActionRun },
    });
    await AutomationActionRun.query().findById(automationActionRun.id).patch({
      jobStatus: "complete",
      completedAt: new Date().toISOString(),
      conclusion: "success",
    });
  } catch (error) {
    if (error instanceof AutomationActionFailureError) {
      await AutomationActionRun.query().findById(automationActionRun.id).patch({
        jobStatus: "complete",
        completedAt: new Date().toISOString(),
        conclusion: "failed",
        failureReason: error.message,
      });
      return;
    }

    throw error;
  }
}

export const job = createModelJob(
  "AutomationActionRun",
  AutomationActionRun,
  processAutomationActionRun,
);
