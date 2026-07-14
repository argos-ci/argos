/**
 * OAuth 2.1 scope catalog.
 *
 * Scopes are enforced *on top of* the user's real account/project role, which is
 * re-validated on every request (see `auth/oauth-access-token.ts`). A scope can
 * therefore only ever *narrow* what the authenticated user is already allowed to
 * do — never widen it.
 */

export const OAUTH_SCOPES = {
  profile: {
    title: "Profile",
    description:
      "Read your Argos profile and the list of organizations you belong to.",
  },
  "projects:read": {
    title: "Read projects",
    description:
      "Read your projects, builds, screenshots, diffs, tests, and analytics.",
  },
  "projects:write": {
    title: "Manage projects",
    description: "Create and configure projects and their settings.",
  },
  "builds:write": {
    title: "Upload builds",
    description: "Create and upload builds and screenshots.",
  },
  "reviews:write": {
    title: "Review builds",
    description:
      "Approve, reject, or dismiss build reviews and ignore changes.",
  },
  "comments:read": {
    title: "Read comments",
    description: "Read build comments and threads.",
  },
  "comments:write": {
    title: "Write comments",
    description:
      "Post, edit, and delete comments, add reactions, and manage subscriptions.",
  },
  "account:admin": {
    title: "Administer organizations",
    description: "Manage organization settings and members.",
  },
} as const satisfies Record<string, { title: string; description: string }>;

export type OAuthScope = keyof typeof OAUTH_SCOPES;

/** All supported scopes, in the order they should be presented to the user. */
export const OAUTH_SCOPE_LIST = Object.keys(OAUTH_SCOPES) as OAuthScope[];

export function isOAuthScope(value: string): value is OAuthScope {
  return Object.prototype.hasOwnProperty.call(OAUTH_SCOPES, value);
}

/**
 * Parse a space-delimited scope string into a de-duplicated list of known
 * scopes. Unknown/empty entries are dropped.
 */
export function parseScopeString(
  scope: string | null | undefined,
): OAuthScope[] {
  if (!scope) {
    return [];
  }
  const seen = new Set<OAuthScope>();
  for (const entry of scope.split(/\s+/)) {
    if (isOAuthScope(entry)) {
      seen.add(entry);
    }
  }
  return OAUTH_SCOPE_LIST.filter((scope) => seen.has(scope));
}

/**
 * Parse a scope string, throwing on any unknown scope. Used where the OAuth
 * spec expects an `invalid_scope` error rather than silent truncation.
 */
export function parseScopeStringStrict(
  scope: string | null | undefined,
): OAuthScope[] {
  if (!scope) {
    return [];
  }
  const entries = scope.split(/\s+/).filter(Boolean);
  const unknown = entries.filter((entry) => !isOAuthScope(entry));
  if (unknown.length > 0) {
    throw new UnknownScopeError(unknown);
  }
  return parseScopeString(scope);
}

export function serializeScopes(scopes: readonly OAuthScope[]): string {
  return scopes.join(" ");
}

export class UnknownScopeError extends Error {
  scopes: string[];
  constructor(scopes: string[]) {
    super(`Unknown scope(s): ${scopes.join(", ")}`);
    this.name = "UnknownScopeError";
    this.scopes = scopes;
  }
}
