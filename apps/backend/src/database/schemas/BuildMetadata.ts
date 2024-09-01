import { z } from "zod";

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

export const BuildMetadataJsonSchema = {
  type: "object",
  properties: {
    testReport: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["passed", "failed", "timedout", "interrupted"],
        },
        stats: {
          type: "object",
          properties: {
            startTime: {
              type: "string",
            },
            duration: {
              type: "number",
            },
          },
          additionalProperties: false,
          required: [],
        },
      },
      additionalProperties: false,
      required: ["status"],
    },
  },
  additionalProperties: false,
};
