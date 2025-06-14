import type { UseFormReturn } from "react-hook-form";
import { z } from "zod/v4";

import {
  AutomationActionType,
  AutomationConditionType,
  AutomationEvent,
  BuildStatus,
  BuildType,
} from "@/gql/graphql";

export const BuildConclusionConditionSchema = z.object({
  type: z.literal(AutomationConditionType.BuildConclusion),
  value: z
    .enum([BuildStatus.NoChanges, BuildStatus.ChangesDetected])
    .nullable(),
});

export const BuildNameConditionSchema = z.object({
  type: z.literal(AutomationConditionType.BuildName),
  value: z.string().nonempty({ message: "Required" }),
});

export const BuildTypeConditionSchema = z.object({
  type: z.literal(AutomationConditionType.BuildType),
  value: z.enum(BuildType).nullable(),
});

export const BuildConditionSchema = z.discriminatedUnion("type", [
  BuildConclusionConditionSchema,
  BuildNameConditionSchema,
  BuildTypeConditionSchema,
]);

const AutomationSlackActionSchema = z.object({
  type: z.literal(AutomationActionType.SendSlackMessage),
  payload: z.object({
    slackId: z
      .string()
      .min(1, { message: "Required" })
      .max(256, { message: "Must be 256 characters or less" }),
    name: z.string().min(1, { message: "Required" }).max(21, {
      message: "Must be 21 characters or less",
    }),
  }),
});

export const AutomationActionSchema = z.discriminatedUnion("type", [
  AutomationSlackActionSchema,
]);
export type AutomationAction = z.infer<typeof AutomationActionSchema>;

export const AutomationFieldValuesSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Please enter a name" })
    .min(3, { message: "Must be at least 3 characters" })
    .max(100, { message: "Must be 100 characters or less" }),
  events: z
    .array(z.enum(AutomationEvent))
    .min(1, "At least one event is required"),
  conditions: z.array(BuildConditionSchema),
  actions: z
    .array(AutomationActionSchema)
    .min(1, "At least one action is required"),
});

export type AutomationFieldValues = z.input<typeof AutomationFieldValuesSchema>;
export type AutomationTransformedValues = z.output<
  typeof AutomationFieldValuesSchema
>;

export type AutomationForm = UseFormReturn<
  AutomationFieldValues,
  any,
  AutomationTransformedValues
>;
