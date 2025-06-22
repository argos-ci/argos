import { z } from "zod";

import { zodToJsonSchema } from "@/util/zod";

export const timestampsSchema = zodToJsonSchema(
  z.object({
    id: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  { removeAdditionalStrategy: "strict" },
);

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
);
