import { z } from "zod";

import { BuildConclusionSchema } from "./build-status.js";
import { BuildTypeSchema } from "./build-type.js";

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

const BuildTypeConditionSchema = z.object({
  type: z.literal("build-type"),
  value: BuildTypeSchema,
});

export type BuildTypeCondition = z.infer<typeof BuildTypeConditionSchema>;

const AutomationBuildConditionSchema = z.discriminatedUnion("type", [
  BuildConclusionConditionSchema,
  BuildNameConditionSchema,
  BuildTypeConditionSchema,
]);

export type AutomationBuildCondition = z.infer<
  typeof AutomationBuildConditionSchema
>;

const AutomationNotConditionSchema = z.object({
  not: AutomationBuildConditionSchema,
});

export const AutomationConditionSchema = z.union([
  AutomationBuildConditionSchema,
  AutomationNotConditionSchema,
]);

export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

export type AllAutomationCondition = {
  all: AutomationCondition[];
};

// Form

const AutomationFormBuildConditionSchema = z.discriminatedUnion("type", [
  BuildConclusionConditionSchema.extend({
    value: BuildConclusionConditionSchema.shape.value
      .nullable()
      .optional()
      .refine((val) => val !== null, { message: "Required" }),
  }),
  BuildNameConditionSchema.extend({
    value: BuildNameConditionSchema.shape.value.nonempty({
      error: "Required",
    }),
  }),
  BuildTypeConditionSchema.extend({
    value: BuildTypeConditionSchema.shape.value
      .nullable()
      .optional()
      .refine((val) => val !== null, { message: "Required" }),
  }),
]);

export type AutomationFormBuildCondition = z.infer<
  typeof AutomationFormBuildConditionSchema
>;

const AutomationFormNotConditionSchema = z.object({
  not: AutomationFormBuildConditionSchema,
});

export type AutomationFormNotCondition = z.infer<
  typeof AutomationFormNotConditionSchema
>;

export const AutomationFormConditionSchema = z.union([
  AutomationFormBuildConditionSchema,
  AutomationFormNotConditionSchema,
]);

export type AutomationFormCondition = z.infer<
  typeof AutomationFormConditionSchema
>;
