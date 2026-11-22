import { z } from "zod";

import { AuthMethodSchema } from "./auth-method";

/** The sign-in methods a team can require from its members. */
export const TeamAuthMethodSchema = AuthMethodSchema.extract([
  "google",
  "github",
  "saml",
]);

export type TeamAuthMethod = z.infer<typeof TeamAuthMethodSchema>;

export const TEAM_AUTH_METHODS = {
  google: {
    label: "Google",
    /** Completes "sign in with …": only the team's own accounts count. */
    requirement: "a Google Workspace account on the team's domain",
    /** The error code keeping a member out until they sign in with it. */
    requiredCode: "GOOGLE_AUTH_REQUIRED",
  },
  github: {
    label: "GitHub",
    requirement: "a GitHub account in the team's organization",
    requiredCode: "GITHUB_AUTH_REQUIRED",
  },
  saml: {
    label: "SAML SSO",
    requirement: "SAML SSO",
    requiredCode: "SAML_SSO_REQUIRED",
  },
} as const satisfies Record<
  TeamAuthMethod,
  { label: string; requirement: string; requiredCode: string }
>;

/** The method a team asks for, when `code` keeps a member out of it. */
export function getTeamAuthMethodFromRequiredCode(
  code: unknown,
): TeamAuthMethod | null {
  return (
    TeamAuthMethodSchema.options.find(
      (authMethod) => TEAM_AUTH_METHODS[authMethod].requiredCode === code,
    ) ?? null
  );
}
