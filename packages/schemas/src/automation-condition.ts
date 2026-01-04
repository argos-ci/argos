import { z } from "zod";

import { BuildConclusionSchema } from "./build-status.js";
import { BuildTypeSchema } from "./build-type.js";

const BuildConclusionConditionSchema = z.object({
  type: z.literal("build-conclusion"),
  value: BuildConclusionSchema.nullable().refine((val) => val !== null, {
    message: "Required",
  }),
});

export type BuildConclusionCondition = z.output<
  typeof BuildConclusionConditionSchema
>;

const BuildNameConditionSchema = z.object({
  type: z.literal("build-name"),
  value: z.string().nonempty({
    error: "Required",
  }),
});

export type BuildNameCondition = z.output<typeof BuildNameConditionSchema>;

const BuildTypeConditionSchema = z.object({
  type: z.literal("build-type"),
  value: BuildTypeSchema.nullable().refine((val) => val !== null, {
    message: "Required",
  }),
});

export type BuildTypeCondition = z.infer<typeof BuildTypeConditionSchema>;

const AutomationBuildConditionSchema = z.discriminatedUnion("type", [
  BuildConclusionConditionSchema,
  BuildNameConditionSchema,
  BuildTypeConditionSchema,
]);

export type AutomationBuildCondition = z.output<
  typeof AutomationBuildConditionSchema
>;
export type AutomationInputBuildCondition = z.input<
  typeof AutomationBuildConditionSchema
>;

const AutomationNotConditionSchema = z.object({
  not: AutomationBuildConditionSchema,
});

export type AutomationInputNotCondition = z.input<
  typeof AutomationNotConditionSchema
>;

export const AutomationConditionSchema = z.union([
  AutomationBuildConditionSchema,
  AutomationNotConditionSchema,
]);

export type AutomationCondition = z.output<typeof AutomationConditionSchema>;
export type AutomationInputCondition = z.input<
  typeof AutomationConditionSchema
>;

export type AllAutomationCondition = {
  all: AutomationCondition[];
};
