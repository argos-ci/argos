import { z } from "zod";

const ViewportSchema = z
  .object({
    width: z
      .number()
      .int()
      .min(0)
      .meta({ description: "The width of the viewport" }),
    height: z
      .number()
      .int()
      .min(0)
      .meta({ description: "The height of the viewport" }),
  })
  .meta({
    description: "The viewport dimensions when the screenshot was taken",
  });

const LocationSchema = z
  .object({
    file: z
      .string()
      .meta({ description: "The file where the test is located" }),
    line: z
      .number()
      .int()
      .min(0)
      .meta({ description: "The line number in the file" }),
    column: z
      .number()
      .int()
      .min(0)
      .meta({ description: "The column number in the file" }),
  })
  .meta({ description: "The location of the test in the source code" });

const TestSchema = z
  .object({
    id: z
      .string()
      .optional()
      .nullable()
      .meta({ description: "The unique identifier of the test" }),
    title: z.string().meta({ description: "The title of the test" }),
    titlePath: z
      .array(z.string())
      .meta({ description: "The path of titles leading to the test" }),
    retries: z
      .number()
      .int()
      .min(0)
      .optional()
      .nullable()
      .meta({ description: "The number of retries for the test" }),
    retry: z
      .number()
      .int()
      .min(0)
      .optional()
      .nullable()
      .meta({ description: "The current retry count" }),
    repeat: z
      .number()
      .int()
      .min(0)
      .optional()
      .nullable()
      .meta({ description: "The repeat count for the test" }),
    location: LocationSchema.optional().meta({
      description: "The location of the test in the source code",
    }),
  })
  .meta({ description: "The test that generated the screenshot" });

const BrowserSchema = z
  .object({
    name: z.string().meta({ description: "The name of the browser" }),
    version: z.string().meta({ description: "The version of the browser" }),
  })
  .meta({ description: "The browser that generated the screenshot" });

const AutomationLibrarySchema = z
  .object({
    name: z
      .string()
      .meta({ description: "The name of the automation library" }),
    version: z
      .string()
      .meta({ description: "The version of the automation library" }),
  })
  .meta({
    description: "The automation library that generated the screenshot",
  });

const SdkSchema = z
  .object({
    name: z.string().meta({ description: "The name of the Argos SDK" }),
    version: z.string().meta({ description: "The version of the Argos SDK" }),
  })
  .meta({ description: "The Argos SDK that generated the screenshot" });

export const ScreenshotMetadataSchema = z
  .object({
    url: z
      .string()
      .optional()
      .nullable()
      .meta({ description: "The URL of the page that was screenshotted" }),
    previewUrl: z
      .string()
      .optional()
      .nullable()
      .meta({
        description: "An URL to an accessible preview of the screenshot",
      }),
    viewport: ViewportSchema.optional().nullable(),
    colorScheme: z
      .enum(["light", "dark"])
      .optional()
      .nullable()
      .meta({ description: "The color scheme when the screenshot was taken" }),
    mediaType: z
      .enum(["screen", "print"])
      .optional()
      .nullable()
      .meta({ description: "The media type when the screenshot was taken" }),
    test: TestSchema.nullable().optional().nullable(),
    browser: BrowserSchema.optional().nullable(),
    automationLibrary: AutomationLibrarySchema,
    sdk: SdkSchema,
  })
  .meta({ description: "Metadata about a screenshot" });

export const ScreenshotMetadataJsonSchema = z.toJSONSchema(
  ScreenshotMetadataSchema,
);

export type ScreenshotMetadata = z.infer<typeof ScreenshotMetadataSchema>;
