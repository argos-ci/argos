import { z } from "zod";

import { ScreenshotMetadataSchema } from "@/database/schemas/index.js";
import { SHA256_REGEX } from "@/web/constants.js";

export const ScreenshotInputSchema = z
  .object({
    key: z.string().regex(SHA256_REGEX),
    name: z.string(),
    baseName: z.string().nullable().optional(),
    metadata: ScreenshotMetadataSchema.nullable().optional(),
    pwTraceKey: z.string().regex(SHA256_REGEX).nullable().optional(),
    threshold: z.number().min(0).max(1).nullable().optional(),
  })
  .meta({
    description: "Screenshot input",
    id: "ScreenshotInput",
  });
