import type { Account, Project, User } from "@/database/models";

export type AuthProjectPayload = {
  type: "project";
  project: Project;
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
};

export type AuthPATPayload = {
  type: "pat";
  account: Account;
  user: User;
  scope: Account[];
};

export type AuthOAuthPayload = {
  type: "oauth";
  /** The authenticated user's personal account. */
  account: Account;
  user: User;
  /** Accounts the token is allowed to act on (re-validated per request). */
  scope: Account[];
  /** Granted OAuth scope strings carried by this access token. */
  oauthScopes: string[];
  /** Public identifier of the OAuth client that holds the token. */
  clientId: string;
  /** Id of the `oauth_grants` row backing this token. */
  grantId: string;
};
