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

const BuildNameConditionSchema = z.object({
  type: z.literal("build-name"),
  value: z.string(),
});
export type BuildNameCondition = z.infer<typeof BuildNameConditionSchema>;

export const AutomationConditionSchema = z.discriminatedUnion("type", [
  BuildTypeConditionSchema,
  BuildConclusionConditionSchema,
  BuildNameConditionSchema,
]);
export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

export type AllCondition = {
  all: AutomationCondition[];
};
