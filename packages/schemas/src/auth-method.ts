import { z } from "zod";

/** How a user can sign in to Argos. */
export const AuthMethodSchema = z.enum([
  "email",
  "google",
  "github",
  "gitlab",
  "saml",
  "passkey",
]);

export type AuthMethod = z.infer<typeof AuthMethodSchema>;
