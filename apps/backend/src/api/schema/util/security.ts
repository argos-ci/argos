/**
 * Security requirements referencing the security schemes declared in
 * `schema.ts` (`projectToken` and `personalAccessToken`). Operations use these
 * to document, per endpoint, which kind of token authenticates the request.
 *
 * This mirrors OpenAPI's `SecurityRequirementObject[]`, typed structurally so
 * the operations that consume it stay portable (the underlying type is not
 * exported from `zod-openapi`).
 */
type Security = Record<string, string[]>[];

/**
 * Authenticate with a **project token**. Used by the build and deployment
 * endpoints that act on behalf of a project (typically from CI or the SDK).
 */
export const projectTokenAuth: Security = [{ projectToken: [] }];

/**
 * Authenticate with a **personal access token**. Used by endpoints that perform
 * user actions (reviews and comments), where the acting user's identity
 * matters.
 */
export const personalAccessTokenAuth: Security = [{ personalAccessToken: [] }];

/**
 * Accept **either** a project token or a personal access token. Used by
 * read-only endpoints that are reachable from both CI and a user.
 */
export const anyTokenAuth: Security = [
  { projectToken: [] },
  { personalAccessToken: [] },
];

/**
 * **No authentication.** Used by public endpoints and by the token-exchange
 * endpoints that mint a token in the first place.
 */
export const noAuth: Security = [];
