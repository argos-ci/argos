import { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const ViewportSchema = z
  .object({
    width: z.number().int().min(0).describe("The width of the viewport"),
    height: z.number().int().min(0).describe("The height of the viewport"),
  })
  .describe("The viewport dimensions when the screenshot was taken");

const LocationSchema = z
  .object({
    file: z.string().describe("The file where the test is located"),
    line: z.number().int().min(0).describe("The line number in the file"),
    column: z.number().int().min(0).describe("The column number in the file"),
  })
  .describe("The location of the test in the source code");

const TestSchema = z
  .object({
    id: z.string().optional().describe("The unique identifier of the test"),
    title: z.string().describe("The title of the test"),
    titlePath: z
      .array(z.string())
      .describe("The path of titles leading to the test"),
    retries: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("The number of retries for the test"),
    retry: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("The current retry count"),
    repeat: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("The repeat count for the test"),
    location: LocationSchema.optional().describe(
      "The location of the test in the source code",
    ),
  })
  .strict()
  .describe("The test that generated the screenshot");

const BrowserSchema = z
  .object({
    name: z.string().describe("The name of the browser"),
    version: z.string().describe("The version of the browser"),
  })
  .describe("The browser that generated the screenshot");

const AutomationLibrarySchema = z
  .object({
    name: z.string().describe("The name of the automation library"),
    version: z.string().describe("The version of the automation library"),
  })
  .describe("The automation library that generated the screenshot");

const SdkSchema = z
  .object({
    name: z.string().describe("The name of the Argos SDK"),
    version: z.string().describe("The version of the Argos SDK"),
  })
  .describe("The Argos SDK that generated the screenshot");

export const ScreenshotMetadataSchema = z
  .object({
    url: z
      .string()
      .url()
      .optional()
      .describe("The URL of the page that was screenshotted"),
    previewUrl: z
      .string()
      .url()
      .optional()
      .describe("An URL to an accessible preview of the screenshot"),
    viewport: ViewportSchema.optional(),
    colorScheme: z
      .enum(["light", "dark"])
      .optional()
      .describe("The color scheme when the screenshot was taken"),
    mediaType: z
      .enum(["screen", "print"])
      .optional()
      .describe("The media type when the screenshot was taken"),
    test: TestSchema.nullable().optional(),
    browser: BrowserSchema.optional(),
    automationLibrary: AutomationLibrarySchema,
    sdk: SdkSchema,
  })
  .strict()
  .describe("Metadata about a screenshot");

export const ScreenshotMetadataJsonSchema = zodToJsonSchema(
  ScreenshotMetadataSchema,
  { removeAdditionalStrategy: "strict" },
) as JSONSchema;

export type ScreenshotMetadata = z.infer<typeof ScreenshotMetadataSchema>;
