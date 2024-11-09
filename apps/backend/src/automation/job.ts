import { AutomationActionRun } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";

import { processSendSlackMessageAction } from "./actions/sendSlackMessage";

export const automationActionRunJob = createModelJob(
  "AutomationActionRun",
  AutomationActionRun,
  processAutomationActionRun,
);

async function processAutomationActionRun(
  ActionRun: AutomationActionRun,
): Promise<void> {
  switch (ActionRun.action) {
    case "send_slack_message": {
      await processSendSlackMessageAction(ActionRun);
      break;
    }
    default:
      throw new Error(
        `Unsupported action type: ${ActionRun.action} for AutomationActionRun ${ActionRun.id}`,
      );
  }
}
