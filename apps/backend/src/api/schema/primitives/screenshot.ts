import { z } from "zod";

import { ScreenshotMetadataSchema } from "@/database/schemas/ScreenshotMetadata";
import { SHA256_REGEX } from "@/util/validation";

export const ScreenshotInputSchema = z
  .object({
    key: z.string().regex(SHA256_REGEX),
    name: z.string(),
    baseName: z.string().nullable().optional(),
    parentName: z.string().nullable().optional(),
    metadata: ScreenshotMetadataSchema.nullable().optional(),
    pwTraceKey: z.string().regex(SHA256_REGEX).nullable().optional(),
    threshold: z.number().min(0).max(1).nullable().optional(),
    contentType: z.string().optional().default("image/png"),
  })
  .meta({
    description: "Screenshot input",
    id: "ScreenshotInput",
  });
