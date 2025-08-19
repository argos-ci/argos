import {
  getAutomationAction,
  type AutomationActionType,
} from "./actions/index.js";
import { job } from "./job.js";
import { triggerAutomation, TriggerAutomationProps } from "./triggerAutomation";
import { type AutomationMessage } from "./types/events";

/**
 * Triggers an automation action based on the provided event and payload.
 */
export async function triggerAndRunAutomation(
  args: TriggerAutomationProps,
): Promise<void> {
  const actionRuns = await triggerAutomation(args);
  if (actionRuns.length > 0) {
    await job.push(...actionRuns.map((run) => run.id));
  }
}

/**
 * Tests an automation by simulating the event and payload.
 * This is useful for verifying that the action behaves as expected without
 * actually executing it in a live environment.
 */
export async function testAutomation(args: {
  message: AutomationMessage;
  actions: AutomationActionType[];
}): Promise<void> {
  for (const action of args.actions) {
    const actionDefinition = getAutomationAction(action.action);
    await actionDefinition.test({
      payload: action.actionPayload,
      message: args.message,
    });
  }
}
