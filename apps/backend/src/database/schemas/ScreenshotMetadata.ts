import { z } from "zod";

const ViewportSchema = z.object({
  width: z.number().int().min(0),
  height: z.number().int().min(0),
});

const LocationSchema = z.object({
  file: z.string(),
  line: z.number().int().min(0),
  column: z.number().int().min(0),
});

const TestSchema = z
  .object({
    id: z.string().optional(),
    title: z.string(),
    titlePath: z.array(z.string()),
    retries: z.number().int().min(0).optional(),
    retry: z.number().int().min(0).optional(),
    repeat: z.number().int().min(0).optional(),
    location: LocationSchema.optional(),
  })
  .strict();

const BrowserSchema = z.object({
  name: z.string(),
  version: z.string(),
});

const AutomationLibrarySchema = z.object({
  name: z.string(),
  version: z.string(),
});

const SdkSchema = z.object({
  name: z.string(),
  version: z.string(),
});

export const ScreenshotMetadataSchema = z
  .object({
    url: z.string().optional(),
    viewport: ViewportSchema.optional(),
    colorScheme: z.enum(["light", "dark"]).optional(),
    mediaType: z.enum(["screen", "print"]).optional(),
    test: TestSchema.nullable().optional(),
    browser: BrowserSchema.optional(),
    automationLibrary: AutomationLibrarySchema,
    sdk: SdkSchema,
  })
  .strict();

export const ScreenshotMetadataJsonSchema = {
  type: ["object", "null"],
  properties: {
    url: {
      type: "string",
    },
    viewport: {
      type: "object",
      properties: {
        width: {
          type: "integer",
          minimum: 0,
        },
        height: {
          type: "integer",
          minimum: 0,
        },
      },
      required: ["width", "height"],
    },
    colorScheme: {
      type: "string",
      enum: ["light", "dark"],
    },
    mediaType: {
      type: "string",
      enum: ["screen", "print"],
    },
    test: {
      oneOf: [
        {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            title: {
              type: "string",
            },
            titlePath: {
              type: "array",
              items: {
                type: "string",
              },
            },
            retries: {
              type: "integer",
              minimum: 0,
            },
            retry: {
              type: "integer",
              minimum: 0,
            },
            repeat: {
              type: "integer",
              minimum: 0,
            },
            location: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                },
                line: {
                  type: "integer",
                  minimum: 0,
                },
                column: {
                  type: "integer",
                  minimum: 0,
                },
              },
              required: ["file", "line", "column"],
            },
          },
          required: ["title", "titlePath"],
        },
        {
          type: "null",
        },
      ],
    },
    browser: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
      required: ["name", "version"],
    },
    automationLibrary: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
      required: ["name", "version"],
    },
    sdk: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
      required: ["name", "version"],
    },
  },
  required: ["sdk", "automationLibrary"],
};

export type ScreenshotMetadata = z.infer<typeof ScreenshotMetadataSchema>;
