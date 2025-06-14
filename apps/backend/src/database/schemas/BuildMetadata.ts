import type { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

export const BuildMetadataSchema = z
  .object({
    testReport: z
      .object({
        status: z.enum(["passed", "failed", "timedout", "interrupted"]),
        stats: z
          .object({
            startTime: z.string().optional(),
            duration: z.number().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type BuildMetadata = z.infer<typeof BuildMetadataSchema>;

export const BuildMetadataJsonSchema = zodToJsonSchema(BuildMetadataSchema, {
  removeAdditionalStrategy: "strict",
}) as JSONSchema;
