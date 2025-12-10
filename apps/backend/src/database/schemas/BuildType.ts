import { z } from "zod";

export const BuildTypeSchema = z.enum([
  "reference",
  "check",
  "orphan",
  "skipped",
]);
export type BuildType = z.infer<typeof BuildTypeSchema>;
