import { z } from "zod";

const BuildTypeConditionSchema = z.object({
  type: z.literal("build-type"),
  value: z.enum(["reference", "check"]),
});
export type BuildTypeCondition = z.infer<typeof BuildTypeConditionSchema>;

const BuildConclusionConditionSchema = z.object({
  type: z.literal("build-conclusion"),
  value: z.enum(["no-changes", "changes-detected"]),
});
export type BuildConclusionCondition = z.infer<
  typeof BuildConclusionConditionSchema
>;

export const AutomationConditionSchema = z.union([
  BuildTypeConditionSchema,
  BuildConclusionConditionSchema,
]);
export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

export type AllCondition = {
  all: AutomationCondition[];
};
