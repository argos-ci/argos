import { z } from "zod";

export const BuildMetadataSchema = z.object({
  testReport: z
    .object({
      status: z.enum(["passed", "failed", "timedout", "interrupted"]),
      stats: z
        .object({
          startTime: z.string().optional(),
          duration: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type BuildMetadata = z.infer<typeof BuildMetadataSchema>;

export const BuildMetadataJsonSchema = z.toJSONSchema(BuildMetadataSchema);
