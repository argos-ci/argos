import { z } from "zod";

export const BuildMetadataSchema = z.object({
  testReport: z
    .object({
      status: z.enum(["passed", "failed", "timedout", "interrupted"]),
      stats: z
        .object({
          startTime: z.string().optional(),
          duration: z.number().optional(),
          tests: z.number().optional(),
          expected: z.number().optional(),
          unexpected: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

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
            tests: {
              type: "number",
            },
            expected: {
              type: "number",
            },
            unexpected: {
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
