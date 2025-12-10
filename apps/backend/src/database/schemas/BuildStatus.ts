import { z } from "zod";

const BuildStatusSchema = z.enum([
  "expired",
  "pending",
  "progress",
  "complete",
  "error",
  "aborted",
]);
export type BuildStatus = z.infer<typeof BuildStatusSchema>;

export const BuildConclusionSchema = z.enum(["no-changes", "changes-detected"]);
export type BuildConclusion = z.infer<typeof BuildConclusionSchema>;

const BuildReviewStatusSchema = z.enum(["accepted", "rejected"]);
export type BuildReviewStatus = z.infer<typeof BuildReviewStatusSchema>;

export const BuildAggregatedStatusSchema = z.union([
  BuildReviewStatusSchema,
  BuildConclusionSchema,
  BuildStatusSchema.exclude(["complete"]),
]);
export type BuildAggregatedStatus = z.infer<typeof BuildAggregatedStatusSchema>;
