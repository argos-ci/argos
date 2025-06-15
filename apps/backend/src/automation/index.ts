import {
  getAutomationAction,
  type AutomationActionType,
} from "./actions/index.js";
import { job } from "./job.js";
import { triggerAutomation, TriggerAutomationProps } from "./triggerAutomation";
import {
  AutomationEvent,
  type AutomationEventPayloadMap,
} from "./types/events";

/**
 * Triggers an automation action based on the provided event and payload.
 */
export async function triggerAndRunAutomation<Event extends AutomationEvent>(
  args: TriggerAutomationProps<Event>,
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
export async function testAutomation<Event extends AutomationEvent>(args: {
  event: Event;
  payload: AutomationEventPayloadMap[Event];
  actions: AutomationActionType[];
}): Promise<void> {
  const { event, payload } = args;
  for (const action of args.actions) {
    const actionDefinition = getAutomationAction(action.action);
    await actionDefinition.test({
      payload: action.actionPayload,
      event,
      eventPayload: payload,
    });
  }
}
