import type { JSONSchema } from "objection";
import { z } from "zod";

export const timestampsSchema = z.toJSONSchema(
  z.object({
    id: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  { io: "input" },
) as JSONSchema;

const JobStatusSchema = z.enum([
  "pending",
  "progress",
  "complete",
  "error",
  "aborted",
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const jobModelSchema = z.toJSONSchema(
  z.object({
    jobStatus: JobStatusSchema,
  }),
  { io: "input" },
) as JSONSchema;
