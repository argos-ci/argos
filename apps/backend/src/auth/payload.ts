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
};

export type AuthPATPayload = {
  type: "pat";
  account: Account;
  user: User;
  scope: Account[];
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
