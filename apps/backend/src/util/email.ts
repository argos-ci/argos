import { slugify } from "./slug";

/**
 * Sanitize email before inserting in database.
 */
export function sanitizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Get a URL-friendly slug from an email address.
 */
export function getSlugFromEmail(email: string): string {
  const sanitized = sanitizeEmail(email);
  const [localPart] = sanitized.split("@");
  if (!localPart) {
    throw new Error(`Invalid email: ${email}`);
  }
  return slugify(localPart);
}
