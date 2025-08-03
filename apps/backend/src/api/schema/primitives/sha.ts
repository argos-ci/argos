import { z } from "zod";

import { SHA1_REGEX, SHA256_REGEX } from "@/util/validation";

export const Sha1HashSchema = z.string().regex(SHA1_REGEX).meta({
  description: "SHA1 hash",
  id: "Sha1Hash",
});

const Sha256HashSchema = z.string().regex(SHA256_REGEX).meta({
  description: "SHA256 hash",
  id: "Sha256Hash",
});

export const UniqueSha256HashArraySchema = z
  .array(Sha256HashSchema)
  .refine((items) => new Set(items).size === items.length, {
    message: "Must be an array of unique strings",
  });
