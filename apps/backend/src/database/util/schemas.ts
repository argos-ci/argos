import type { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

export const timestampsSchema = zodToJsonSchema(
  z.object({
    id: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  { removeAdditionalStrategy: "strict" },
) as JSONSchema;

const JobStatusSchema = z.enum([
  "pending",
  "progress",
  "complete",
  "error",
  "aborted",
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const jobModelSchema = zodToJsonSchema(
  z.object({
    jobStatus: JobStatusSchema,
  }),
  { removeAdditionalStrategy: "strict" },
) as JSONSchema;
