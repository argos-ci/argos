import { z } from "zod";

import { BuildConclusionSchema } from "./build-status.js";
import { BuildTypeSchema } from "./build-type.js";

const BuildModeSchema = z.enum(["ci", "monitoring"]);

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

const BuildBranchConditionSchema = z.object({
  type: z.literal("build-branch"),
  value: z.string().nonempty({
    error: "Required",
  }),
});

export type BuildBranchCondition = z.output<typeof BuildBranchConditionSchema>;

const BuildModeConditionSchema = z.object({
  type: z.literal("build-mode"),
  value: BuildModeSchema.nullable().refine((val) => val !== null, {
    message: "Required",
  }),
});

export type BuildModeCondition = z.output<typeof BuildModeConditionSchema>;

const BuildTypeConditionSchema = z.object({
  type: z.literal("build-type"),
  value: BuildTypeSchema.nullable().refine((val) => val !== null, {
    message: "Required",
  }),
});

export type BuildTypeCondition = z.infer<typeof BuildTypeConditionSchema>;

export const AutomationBuildConditionSchema = z.discriminatedUnion("type", [
  BuildBranchConditionSchema,
  BuildConclusionConditionSchema,
  BuildModeConditionSchema,
  BuildNameConditionSchema,
  BuildTypeConditionSchema,
]);

export type AutomationBuildCondition = z.output<
  typeof AutomationBuildConditionSchema
>;
export type AutomationInputBuildCondition = z.input<
  typeof AutomationBuildConditionSchema
>;

const AutomationGlobConditionSchema = z.object({
  glob: BuildBranchConditionSchema,
});

export type AutomationGlobCondition = z.output<
  typeof AutomationGlobConditionSchema
>;
export type AutomationInputGlobCondition = z.input<
  typeof AutomationGlobConditionSchema
>;

const AutomationComparableConditionSchema = z.union([
  AutomationBuildConditionSchema,
  AutomationGlobConditionSchema,
]);

const AutomationNotConditionSchema = z.object({
  not: AutomationComparableConditionSchema,
});

export type AutomationInputNotCondition = z.input<
  typeof AutomationNotConditionSchema
>;

export const AutomationConditionSchema = z.union([
  AutomationComparableConditionSchema,
  AutomationNotConditionSchema,
]);

export type AutomationCondition = z.output<typeof AutomationConditionSchema>;
export type AutomationInputCondition = z.input<
  typeof AutomationConditionSchema
>;

export type AllAutomationCondition = {
  all: AutomationCondition[];
};
