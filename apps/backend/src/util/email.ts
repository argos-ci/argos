/**
 * Sanitize email before inserting in database.
 */
export function sanitizeEmail(email: string) {
  return email.trim().toLowerCase();
}
