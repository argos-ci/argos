import { slugify } from "@argos/util/slug";
import z from "zod";

import { boom } from "./error";

const EmailSchema = z.email();

/**
 * Check if the email is valid.
 */
export function checkIsValidEmail(email: string) {
  return EmailSchema.safeParse(email).success;
}

/**
 * Sanitize email before inserting in database.
 */
export function sanitizeEmail(email: string) {
  if (!checkIsValidEmail(email)) {
    throw boom(400, "Invalid email");
  }
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
