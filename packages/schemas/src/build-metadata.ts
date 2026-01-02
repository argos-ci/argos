import { z } from "zod";

export const BuildMetadataSchema = z
  .object({
    testReport: z
      .object({
        status: z
          .enum(["passed", "failed", "timedout", "interrupted"])
          .meta({ description: "Status of the test suite" }),
        stats: z
          .object({
            startTime: z
              .string()
              .optional()
              .meta({ description: "Date when the test suite started" }),
            duration: z.number().optional().meta({
              description: "Duration of the test suite in milliseconds",
            }),
          })
          .optional(),
      })
      .optional()
      .meta({ description: "Test suite report" }),
  })
  .meta({ description: "Metadata associated to the build" });

export type BuildMetadata = z.infer<typeof BuildMetadataSchema>;

export const BuildMetadataJsonSchema = z.toJSONSchema(BuildMetadataSchema);
