import baseSlugify from "@sindresorhus/slugify";

/**
 * Slug JSON schema
 */
export const slugJsonSchema = {
  type: "string",
  minLength: 1,
  maxLength: 48,
  pattern: "^[-a-z0-9]+$",
};

/**
 * Slugify a string to match "^[-a-z0-9]+$" pattern.
 */
export function slugify(str: string): string {
  const slug = baseSlugify(str);
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
