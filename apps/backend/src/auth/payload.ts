import { assertNever } from "@argos/util/assertNever";

import type { Account, Project, User } from "@/database/models";
import type { ProjectTokenPermission } from "@/project-token/permissions";

export type AuthProjectPayload = {
  type: "project";
  /**
   * Live projects the bearer can act on, owned by the token's account. Never
   * empty. Short-lived and tokenless bearers carry exactly one.
   */
  projects: Project[];
  permissions: readonly ProjectTokenPermission[];
  /** Id of the `project_tokens` row, `null` for short-lived and tokenless bearers. */
  tokenId: string | null;
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
  /** The team whose SAML login opened this session, if any. */
  samlTeamId: string | null;
};

export type AuthPATPayload = {
  type: "pat";
  account: Account;
  user: User;
  scope: Account[];
  /** Teams of the scope the token was issued for through their SAML IdP. */
  samlTeamIds: string[];
  /** Teams left out of `scope` because they enforce SAML. */
  samlRequiredScope: Account[];
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
  /** Teams of the scope the grant was given for through their SAML IdP. */
  samlTeamIds: string[];
  /** Teams left out of `scope` because they enforce SAML. */
  samlRequiredScope: Account[];
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
 * authenticated: who made it, and which teams' SAML IdPs it went through.
 */
export type AuthViewer =
  | Pick<AuthSessionPayload, "type" | "user" | "samlTeamId">
  | Pick<AuthPATPayload | AuthOAuthPayload, "type" | "user" | "samlTeamIds">;

/**
 * Whether the request went through `teamId`'s SAML IdP: the session was opened
 * by a SAML login to that team, or the token was issued from such a session.
 */
export function checkAuthSatisfiesTeamSaml(
  auth: AuthViewer,
  teamId: string | null,
): boolean {
  if (!teamId) {
    return false;
  }
  switch (auth.type) {
    case "session":
      return auth.samlTeamId === teamId;
    case "pat":
    case "oauth":
      return auth.samlTeamIds.includes(teamId);
    default:
      return assertNever(auth);
  }
}
