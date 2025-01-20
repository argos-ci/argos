import { JSONSchema } from "objection";
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
    previewUrl: z.string().optional(),
    viewport: ViewportSchema.optional(),
    colorScheme: z.enum(["light", "dark"]).optional(),
    mediaType: z.enum(["screen", "print"]).optional(),
    test: TestSchema.nullable().optional(),
    browser: BrowserSchema.optional(),
    automationLibrary: AutomationLibrarySchema,
    sdk: SdkSchema,
  })
  .strict();

export const ScreenshotMetadataJsonSchema: JSONSchema = {
  description: "Metadata about a screenshot",
  type: ["object", "null"],
  properties: {
    url: {
      description: "The URL of the page that was screenshotted",
      type: "string",
    },
    previewUrl: {
      description: "An URL to an accessible preview of the screenshot",
      type: "string",
      format: "uri",
    },
    viewport: {
      description: "The viewport dimensions when the screenshot was taken",
      type: "object",
      properties: {
        width: {
          description: "The width of the viewport",
          type: "integer",
          minimum: 0,
        },
        height: {
          description: "The height of the viewport",
          type: "integer",
          minimum: 0,
        },
      },
      required: ["width", "height"],
    },
    colorScheme: {
      description: "The color scheme when the screenshot was taken",
      type: "string",
      enum: ["light", "dark"],
    },
    mediaType: {
      description: "The media type when the screenshot was taken",
      type: "string",
      enum: ["screen", "print"],
    },
    test: {
      description: "The test that generated the screenshot",
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
      description: "The browser that generated the screenshot",
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
      description: "The automation library that generated the screenshot",
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
      description: "The Argos SDK that generated the screenshot",
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
