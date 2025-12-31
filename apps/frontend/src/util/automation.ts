import { assertNever } from "@argos/util/assertNever";
import { z } from "zod/v4";

import { BuildType } from "@/gql/graphql";

const BuildConclusionConditionSchema = z.object({
  type: z.literal("build-conclusion"),
  value: z
    .enum(["no-changes", "changes-detected"])
    .nullable()
    .optional()
    .refine((val) => val !== null, { message: "Required" }),
});

const BuildNameConditionSchema = z.object({
  type: z.literal("build-name"),
  value: z.string().nonempty({ error: "Required" }),
});

const BuildTypeConditionSchema = z.object({
  type: z.literal("build-type"),
  value: z
    .enum(BuildType)
    .nullable()
    .optional()
    .refine((val) => val !== null, { message: "Required" }),
});

const BuildConditionSchema = z.discriminatedUnion("type", [
  BuildConclusionConditionSchema,
  BuildNameConditionSchema,
  BuildTypeConditionSchema,
]);

type BuildCondition = z.infer<typeof BuildConditionSchema>;

const NotConditionSchema = z.object({ not: BuildConditionSchema });

type NotCondition = z.infer<typeof NotConditionSchema>;

export const AutomationConditionSchema = z.union([
  BuildConditionSchema,
  NotConditionSchema,
]);

type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

/**
 * Check if the condition is a "neq" one.
 */
export function checkIsNotCondition(
  condition: AutomationCondition,
): condition is NotCondition {
  return "not" in condition && condition.not !== undefined;
}

/**
 * Extract the build condition from an automation condition.
 * If the condition is a direct build condition, return it.
 * Otherwise, extract it from the `not` wrapper.
 */
export function getBuildCondition(
  condition: AutomationCondition,
): BuildCondition {
  if (checkIsNotCondition(condition)) {
    return condition.not;
  }
  return condition;
}

const AutomationSlackActionSchema = z.object({
  type: z.literal("sendSlackMessage"),
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

export const AutomationEvents = ["build.completed", "build.reviewed"] as const;

export const AutomationEventSchema = z.enum(AutomationEvents);

type AutomationEvent = z.infer<typeof AutomationEventSchema>;

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
