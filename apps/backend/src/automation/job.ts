import { invariant } from "@argos/util/invariant";

import { AutomationActionRun } from "@/database/models/index.js";
import { createModelJob, UnretryableError } from "@/job-core/index.js";

import { getAutomationAction } from "./actions";
import { AutomationActionContext } from "./defineAutomationAction";

async function processAutomationActionRun(
  automationActionRun: AutomationActionRun,
): Promise<void> {
  // Get the action
  const actionDefinition = getAutomationAction(automationActionRun.action);

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
    `Invalid payload for action ${automationActionRun.action}: ${parsingError}`,
    UnretryableError,
  );

  // Process the action
  const jobContext: AutomationActionContext = { automationActionRun };
  await actionDefinition.process({ ...validatedPayload, ctx: jobContext });
}

export const job = createModelJob(
  "AutomationActionRun",
  AutomationActionRun,
  processAutomationActionRun,
);
