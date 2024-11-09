import { AutomationActionRun } from "../../database/models";

export async function ActionRunError({
  actionRunId,
  failureReason,
}: {
  actionRunId: string;
  failureReason: string;
}): Promise<void> {
  await AutomationActionRun.query().findById(actionRunId).patch({
    jobStatus: "complete",
    conclusion: "failed",
    failureReason,
    completedAt: new Date().toISOString(),
  });
}
