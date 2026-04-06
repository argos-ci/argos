import baseSlugify from "@sindresorhus/slugify";

/**
 * Regex to validate a slug.
 * A slug must be lowercase alphanumeric, may contain hyphens in the middle,
 * and must start and end with an alphanumeric character.
 */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Slug JSON schema
 */
export const slugJsonSchema = {
  type: "string",
  minLength: 1,
  maxLength: 48,
  pattern: SLUG_REGEX.source,
};

/**
 * Slugify a string to match the slug regex.
 */
export function slugify(str: string): string {
  // Be sure the slug is not too long (max 48 chars)
  const slug = baseSlugify(str).slice(0, 48);
  // We failed to generate a slug, return a generic one.
  // It can happen with strings that are not ASCII.
  if (str.length > 0 && slug.length === 0) {
    return generateRandomSlug();
  }
  return slug;
}

const NAMES = [
  "unicorn",
  "rainbow",
  "butterfly",
  "sunshine",
  "flower",
  "sparkle",
  "glitter",
  "moonbeam",
  "cloud",
  "marshmallow",
];

/**
 * Generate a random slug to be used when the user doesn't provide one.
 */
function generateRandomSlug(): string {
  return `${NAMES[Math.floor(Math.random() * NAMES.length)]}-${Math.floor(Math.random() * 1000)}`;
}
