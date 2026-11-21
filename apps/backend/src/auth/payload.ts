import type { ProjectTokenPermission } from "@argos/schemas/project-token";
import type { TeamAuthMethod } from "@argos/schemas/team-auth-method";
import { assertNever } from "@argos/util/assertNever";

import type { Account, Project, User } from "@/database/models";

import type { AuthMethod } from "./auth-method";

export const AUTH_PROJECT_SOURCES = [
  "project-token",
  "github-actions-oidc",
  "github-actions-tokenless",
] as const;

export type AuthProjectSource = (typeof AUTH_PROJECT_SOURCES)[number];

export type AuthProjectPayload = {
  type: "project";
  /** How the bearer was obtained. */
  source: AuthProjectSource;
  /**
   * Live projects the bearer can act on, owned by the token's account. Never
   * empty. Short-lived and tokenless bearers carry exactly one. The account of
   * a token's projects is fetched with them.
   */
  projects: Project[];
  permissions: readonly ProjectTokenPermission[];
  /**
   * Commit SHA the bearer is bound to. Populated when the bearer is a
   * short-lived token minted from a GitHub Actions OIDC claim that carried
   * a `sha`. `null` for project tokens, tokenless bearers, and short-lived
   * tokens minted without a sha claim.
   */
  sha: string | null;
};

export type AuthSessionPayload = {
  type: "session";
  account: Account;
  user: User;
  /** Id of the `user_sessions` row backing this request. */
  sessionId: string;
  /** How the session was opened. Null on sessions predating the column. */
  authMethod: AuthMethod | null;
  /** The team whose SAML login opened this session, if any. */
  samlTeamId: string | null;
};

/** How the user signed in for a team when a token was issued for it. */
export type TokenTeamAuthMethod = { teamId: string; authMethod: AuthMethod };

/**
 * A team left out of a token's scope because it requires a sign-in method the
 * token was not issued through, kept so the API can say which one.
 */
export type RestrictedScopeEntry = {
  account: Account;
  requiredAuthMethod: TeamAuthMethod;
};

export type AuthPATPayload = {
  type: "pat";
  account: Account;
  user: User;
  scope: Account[];
  /** How the user had signed in for each team of the scope. */
  teamAuthMethods: TokenTeamAuthMethod[];
  restrictedScope: RestrictedScopeEntry[];
  /** Id of the `user_access_tokens` row backing this request. */
  tokenId: string;
};

export type AuthOAuthPayload = {
  type: "oauth";
  /** The authenticated user's personal account. */
  account: Account;
  user: User;
  /** Accounts the token is allowed to act on (re-validated per request). */
  scope: Account[];
  /** How the user had signed in for each team of the scope. */
  teamAuthMethods: TokenTeamAuthMethod[];
  restrictedScope: RestrictedScopeEntry[];
  /** Granted OAuth scope strings carried by this access token. */
  oauthScopes: string[];
  /** Public identifier of the OAuth client that holds the token. */
  clientId: string;
  /**
   * Id of the well-known app the client was matched to at registration
   * (`oauth/known-apps.ts`), `null` for an unrecognized client.
   */
  knownAppId: string | null;
  /** Id of the `oauth_grants` row backing this token. */
  grantId: string;
};

/**
 * What permission checks read from a user's request, whichever way they
 * authenticated: who made it, and how they signed in.
 */
export type AuthViewer =
  | Pick<AuthSessionPayload, "type" | "user" | "authMethod" | "samlTeamId">
  | Pick<
      AuthPATPayload | AuthOAuthPayload,
      "type" | "user" | "teamAuthMethods"
    >;

/**
 * How the request's user signed in, as far as `teamId` is concerned: the
 * session's method, or for a token, the method of the session it was issued
 * from. This is what a team's required sign-in method is checked against.
 */
export function getAuthMethodForTeam(
  auth: AuthViewer,
  teamId: string | null,
): AuthMethod | null {
  if (!teamId) {
    return null;
  }
  switch (auth.type) {
    case "session":
      // A SAML login says nothing about the user to a team other than the one
      // whose IdP answered.
      if (auth.authMethod === "saml") {
        return auth.samlTeamId === teamId ? "saml" : null;
      }
      return auth.authMethod;
    case "pat":
    case "oauth":
      return (
        auth.teamAuthMethods.find((entry) => entry.teamId === teamId)
          ?.authMethod ?? null
      );
    default:
      return assertNever(auth);
  }
}
