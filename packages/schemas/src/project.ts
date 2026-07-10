import { z } from "zod";

/**
 * Validation for a project name, shared between the `Project` model's JSON
 * schema and the public API operation so both enforce the exact same rules.
 *
 * A name is 1–100 characters and may only contain letters, digits, and the
 * `-`, `_`, and `.` separators. Surrounding whitespace is trimmed before
 * validation.
 */
export const ProjectNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_\-.]+$/, {
    message:
      "Project name can only contain letters, numbers, dots, hyphens and underscores.",
  });
