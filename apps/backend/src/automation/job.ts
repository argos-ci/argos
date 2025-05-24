import { invariant } from "@argos/util/invariant";

import { AutomationActionRun } from "@/database/models/index.js";
import { createModelJob, UnretryableError } from "@/job-core/index.js";

import { ActionContext, actionRegistry } from "./actionRegistry";

export const automationActionRunJob = createModelJob(
  "AutomationActionRun",
  AutomationActionRun,
  processAutomationActionRun,
);

async function processAutomationActionRun(
  automationActionRun: AutomationActionRun,
): Promise<void> {
  // Get the action
  const actionDefinition = actionRegistry.get(automationActionRun.action);

  invariant(
    actionDefinition,
    `Unsupported action type: ${automationActionRun.action}. Action not found in registry.`,
    UnretryableError,
  );

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
    `Invalid payload for action ${automationActionRun.action}: ${parsingError.message}`,
    UnretryableError,
  );

  // Process the action
  const jobContext: ActionContext = {
    automationActionRun: automationActionRun,
  };
  await actionDefinition.process(validatedPayload, jobContext);
}
