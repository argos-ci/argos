import { job } from "./job.js";
import { triggerAutomation, TriggerAutomationProps } from "./triggerAutomation";
import { AutomationEvent } from "./types/events";

export async function triggerAndRunAutomation<Event extends AutomationEvent>(
  props: TriggerAutomationProps<Event>,
): Promise<void> {
  const actionRuns = await triggerAutomation(props);
  if (actionRuns.length > 0) {
    await job.push(...actionRuns.map((run) => run.id));
  }
}
