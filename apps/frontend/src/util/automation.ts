import { AutomationSlackActionTypeSchema } from "@argos/schemas/automation-action";
import {
  type AutomationInputBuildCondition,
  type AutomationInputCondition,
  type AutomationInputGlobCondition,
  type AutomationInputNotCondition,
} from "@argos/schemas/automation-condition";
import { AutomationEvent } from "@argos/schemas/automation-event";
import { assertNever } from "@argos/util/assertNever";
import { z } from "zod/v4";

/**
 * Check if the condition is a "neq" one.
 */
export function checkIsNotCondition(
  condition: AutomationInputCondition,
): condition is AutomationInputNotCondition {
  return "not" in condition && condition.not !== undefined;
}

/**
 * Check if the condition is a "glob" one.
 */
export function checkIsGlobCondition(
  condition: AutomationInputCondition | AutomationInputNotCondition["not"],
): condition is AutomationInputGlobCondition {
  return "glob" in condition && condition.glob !== undefined;
}

/**
 * Extract the build condition from an automation condition.
 * If the condition is a direct build condition, return it.
 * Otherwise, extract it from the operator wrapper.
 */
export function getBuildCondition(
  condition: AutomationInputCondition,
): AutomationInputBuildCondition {
  if (checkIsNotCondition(condition)) {
    return getBuildCondition(condition.not);
  }
  if (checkIsGlobCondition(condition)) {
    return condition.glob;
  }
  return condition;
}

const AutomationSlackActionSchema = z.object({
  type: AutomationSlackActionTypeSchema,
  payload: z.object({
    slackId: z.string().max(256, { message: "Must be 256 characters or less" }),
    name: z.string().min(1, { message: "Required" }).max(256, {
      message: "Must be 256 characters or less",
    }),
  }),
});

export const AutomationActionSchema = z.discriminatedUnion("type", [
  AutomationSlackActionSchema,
]);

/**
 * Get the label for an automation event.
 */
export function getAutomationEventLabel(event: AutomationEvent): string {
  switch (event) {
    case "build.completed":
      return "Build Completed";
    case "build.reviewed":
      return "Build Reviewed";
    default:
      assertNever(event);
  }
}
