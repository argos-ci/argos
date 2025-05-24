import { AutomationActionRun as DbAutomationActionRun } from "@/database/models/index.js"; // Renamed to avoid conflict
import { createModelJob, UnretryableError } from "@/job-core/index.js";
import { actionRegistry, ActionContext } from "./actionRegistry";
import { AutomationActionRun as PrismaAutomationActionRun } from '@prisma/client'; // Prisma model
import logger from "@/logger";
import { z } from "zod";

export const automationActionRunJob = createModelJob(
  "AutomationActionRun",
  DbAutomationActionRun, // Use Objection model for the job framework
  processAutomationActionRun,
);

async function processAutomationActionRun(
  dbActionRun: DbAutomationActionRun, // This is an Objection model instance
): Promise<void> {
  const startTime = Date.now();
  const actionType = dbActionRun.action;
  const baseLogContext = {
    automationActionRunId: dbActionRun.id,
    actionType: actionType,
    automationRunId: dbActionRun.automationRunId,
  };

  // METRIC: automation_action_runs_processing_started_total, { actionType }
  logger.info("Processing AutomationActionRun started", baseLogContext);

  const actionDefinition = actionRegistry.get(actionType);

  if (!actionDefinition) {
    // METRIC: automation_action_run_errors_total, { actionType, errorType: 'unretryable' }
    // METRIC: automation_action_runs_processed_total, { actionType, status: 'failed' }
    logger.error(
      `[AutomationJob] No action definition found. This may indicate an issue with action registration or a stale job.`,
      { ...baseLogContext, error: new Error("Action definition not found") }
    );
    throw new UnretryableError(
      `Unsupported action type: ${actionType}. Action not found in registry.`,
    );
  }

  let validatedPayload;
  try {
    validatedPayload = actionDefinition.payloadSchema.parse(dbActionRun.actionPayload);
  } catch (validationError) {
    // METRIC: automation_action_run_errors_total, { actionType, errorType: 'unretryable' }
    // METRIC: automation_action_runs_processed_total, { actionType, status: 'failed' }
    logger.error(
      `[AutomationJob] Payload validation failed.`,
      { ...baseLogContext, error: validationError, originalPayload: dbActionRun.actionPayload }
    );
    throw new UnretryableError(
      `Payload validation failed: ${validationError instanceof z.ZodError ? validationError.message : String(validationError)}`,
    );
  }
  
  const jobContext: ActionContext = {
    automationActionRun: dbActionRun as unknown as PrismaAutomationActionRun,
  };

  try {
    await actionDefinition.process(validatedPayload, jobContext);
    const durationSeconds = (Date.now() - startTime) / 1000;
    // METRIC: automation_action_runs_processed_total, { actionType, status: 'success' }
    // METRIC: automation_action_run_duration_seconds, { actionType }
    logger.info(
      `[AutomationJob] Action processed successfully.`,
      { ...baseLogContext, durationSeconds },
    );
  } catch (error: any) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    if (error instanceof UnretryableError) {
      // METRIC: automation_action_run_errors_total, { actionType, errorType: 'unretryable' }
      // METRIC: automation_action_runs_processed_total, { actionType, status: 'failed' }
      logger.error(
        `[AutomationJob] Unretryable error processing action.`,
        { ...baseLogContext, error, durationSeconds }
      );
    } else {
      // Assuming the job runner will handle retry logic and eventually mark as 'retryable_max_attempts' if needed
      // METRIC: automation_action_runs_retrying_total, { actionType } (This metric might be better placed in the job runner itself)
      // For now, we log the error. If it ultimately fails after retries, it would be a 'failed' status.
      logger.error(
        `[AutomationJob] Error processing action. Will be retried if applicable.`,
        { ...baseLogContext, error, durationSeconds }
      );
    }
    throw error; // Re-throw for job runner
  }
}
