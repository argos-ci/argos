import { z } from "zod";

/** The sign-in methods a team can require from its members. */
export const TeamAuthMethodSchema = z.enum(["google", "github", "saml"]);

export type TeamAuthMethod = z.infer<typeof TeamAuthMethodSchema>;

export const TEAM_AUTH_METHOD_LABELS: Record<TeamAuthMethod, string> = {
  google: "Google",
  github: "GitHub",
  saml: "SAML SSO",
};

/**
 * The error code keeping a member out of a team until they sign in with its
 * method, so the app knows which sign-in to offer.
 */
export const TEAM_AUTH_METHOD_REQUIRED_CODES = {
  google: "GOOGLE_AUTH_REQUIRED",
  github: "GITHUB_AUTH_REQUIRED",
  saml: "SAML_SSO_REQUIRED",
} as const satisfies Record<TeamAuthMethod, string>;

export function checkIsTeamAuthMethodRequiredCode(code: unknown): boolean {
  return Object.values(TEAM_AUTH_METHOD_REQUIRED_CODES).some(
    (requiredCode) => requiredCode === code,
  );
}
