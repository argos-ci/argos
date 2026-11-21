/** How a user can sign in to Argos. */
export const AUTH_METHODS = [
  "email",
  "google",
  "github",
  "gitlab",
  "saml",
  "passkey",
] as const;

export type AuthMethod = (typeof AUTH_METHODS)[number];

export function checkIsAuthMethod(value: unknown): value is AuthMethod {
  return AUTH_METHODS.some((method) => method === value);
}
