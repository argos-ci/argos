import Sqids from "sqids";

export const sqids = new Sqids({
  // Use a custom alphabet to avoid ambiguous characters.
  // This alphabet is URL-safe and case-insensitive.
  // This alphabet should never change, as it would break existing IDs.
  alphabet: "FN5LTPGRW98EB2X3ZYHDCU0AS7KJQV64MO1I",
  minLength: 4,
});
