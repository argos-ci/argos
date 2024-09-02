import { SHA1_REGEX, SHA256_REGEX } from "@/web/constants";

import { z } from "../util/zod.js";

export const Sha1HashSchema = z.string().regex(SHA1_REGEX).openapi({
  description: "SHA1 hash",
  ref: "Sha1Hash",
});

const Sha256HashSchema = z.string().regex(SHA256_REGEX).openapi({
  description: "SHA256 hash",
  ref: "Sha256Hash",
});

export const UniqueSha256HashArraySchema = z
  .array(Sha256HashSchema)
  .refine((items) => new Set(items).size === items.length, {
    message: "Must be an array of unique strings",
  });
