import { AutomationActionRun } from "@/database/models";
import { createModelJob } from "@/job-core";

import { AutomationActionSchema, getAutomationAction } from "./actions";
import { AutomationActionFailureError } from "./automationActionError";

export async function processAutomationActionRun(
  automationActionRun: AutomationActionRun,
): Promise<void> {
  const action = AutomationActionSchema.parse({
    action: automationActionRun.action,
    actionPayload: automationActionRun.actionPayload,
  });
  // Get the action
  const actionDefinition = getAutomationAction(action.action);

  // Process the action and update the conclusion status
  try {
    await AutomationActionRun.query().findById(automationActionRun.id).patch({
      processedAt: new Date().toISOString(),
    });
    await actionDefinition.process({
      payload: action.actionPayload,
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
