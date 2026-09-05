import { z } from "zod";

/**
 * Exported because the bound has to be enforced where a name is *typed* as well
 * as where it is stored: the signup page carries a team name through a URL to
 * `/teams/new`, which submits it without a form in between.
 */
export const ACCOUNT_NAME_MAX_LENGTH = 255;

/**
 * Validation for an account name — a person's display name, or a team's —
 * shared between the `Account` model's JSON schema and the services that write
 * it, so an oversized name is refused as user input instead of failing the
 * model's validation as an Objection error nothing maps.
 */
export const AccountNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required." })
  .max(ACCOUNT_NAME_MAX_LENGTH, {
    message: `Name must be ${ACCOUNT_NAME_MAX_LENGTH} characters or less.`,
  });
