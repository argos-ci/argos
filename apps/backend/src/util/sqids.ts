import Sqids from "sqids";

import config from "@/config";

export const sqids = new Sqids({
  // Use a custom alphabet to avoid ambiguous characters.
  // This alphabet is URL-safe and case-insensitive.
  // This alphabet should never change, as it would break existing IDs.
  alphabet: config.get("sqids.alphabet"),
  minLength: 4,
});
