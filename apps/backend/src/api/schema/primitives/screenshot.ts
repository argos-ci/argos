import { ScreenshotMetadataSchema } from "@argos/schemas/screenshot-metadata";
import { z } from "zod";

import { SHA256_REGEX } from "@/util/validation";

export const ScreenshotInputSchema = z
  .object({
    key: z.string().regex(SHA256_REGEX),
    name: z.string(),
    baseName: z.string().nullish(),
    parentName: z.string().nullish(),
    metadata: ScreenshotMetadataSchema.nullish(),
    pwTraceKey: z.string().regex(SHA256_REGEX).nullish(),
    threshold: z.number().min(0).max(1).nullish(),
    contentType: z.string().optional().default("image/png"),
  })
  .meta({
    description: "Screenshot input",
    id: "ScreenshotInput",
  });
