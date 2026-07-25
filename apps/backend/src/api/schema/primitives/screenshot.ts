import { SnapshotContentTypeSchema } from "@argos/schemas/content-type";
import { ScreenshotMetadataSchema } from "@argos/schemas/screenshot-metadata";
import { z } from "zod";

import { SHA256_REGEX } from "@/util/validation";

export const ScreenshotInputSchema = z
  .object({
    key: z.string().regex(SHA256_REGEX),
    name: z.string(),
    baseName: z
      .union([z.string(), z.array(z.string()).min(1)])
      .nullish()
      .meta({
        description:
          "Name(s) to compare this screenshot against, instead of its own name. " +
          "An array is tried in order: the first name that exists in the baseline wins, " +
          "which lets a new screenshot fall back to an existing one.",
        examples: ["home.png", ["home-variant-b.png", "home.png"]],
      }),
    parentName: z.string().nullish(),
    metadata: ScreenshotMetadataSchema.nullish(),
    pwTraceKey: z.string().regex(SHA256_REGEX).nullish(),
    threshold: z.number().min(0).max(1).nullish(),
    contentType: SnapshotContentTypeSchema.default("image/png"),
  })
  .meta({
    description: "Screenshot input",
    id: "ScreenshotInput",
  });
