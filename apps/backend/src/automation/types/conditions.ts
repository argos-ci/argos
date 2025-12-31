import { z } from "zod";

import { BuildConclusionSchema } from "@/database/schemas/BuildStatus";
import { BuildTypeSchema } from "@/database/schemas/BuildType";

const BuildTypeConditionSchema = z.object({
  type: z.literal("build-type"),
  value: BuildTypeSchema,
});
export type BuildTypeCondition = z.infer<typeof BuildTypeConditionSchema>;

const BuildConclusionConditionSchema = z.object({
  type: z.literal("build-conclusion"),
  value: BuildConclusionSchema,
});
export type BuildConclusionCondition = z.infer<
  typeof BuildConclusionConditionSchema
>;

const BuildNameConditionSchema = z.object({
  type: z.literal("build-name"),
  value: z.string(),
});
export type BuildNameCondition = z.infer<typeof BuildNameConditionSchema>;

const BuildConditionSchema = z.discriminatedUnion("type", [
  BuildTypeConditionSchema,
  BuildConclusionConditionSchema,
  BuildNameConditionSchema,
]);

const NotConditionSchema = z.object({ not: BuildConditionSchema });

export const AutomationConditionSchema = z.union([
  BuildConditionSchema,
  NotConditionSchema,
]);
export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

export type AllCondition = {
  all: AutomationCondition[];
};
