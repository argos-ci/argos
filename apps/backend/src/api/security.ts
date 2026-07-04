/**
 * Single source of truth for API authentication.
 *
 * It owns both halves that OpenAPI keeps separate and that used to live in two
 * different files:
 *   - {@link securitySchemes}: the security scheme *definitions* referenced from
 *     the document's `components.securitySchemes`.
 *   - the security *requirement* constants ({@link projectTokenAuth}, …): what
 *     each operation declares in its `security` field to select a scheme.
 *
 * It also turns those declarations into runtime behaviour: {@link authenticateRequest}
 * authenticates a request against an operation's `security`, and
 * {@link AuthFromSecurity} maps the same declaration to the payload type exposed
 * to handlers as `req.ctx.auth`.
 */
import type { Request } from "express";
import type { ZodOpenApiSecuritySchemeObject } from "zod-openapi";

import type { AuthPATPayload, AuthProjectPayload } from "@/auth/payload";
import { boom } from "@/util/error";

import { getAuthPayloadFromExpressReq } from "./auth/project";

/**
 * Security scheme definitions exposed under the document's
 * `components.securitySchemes`. The keys are the scheme names referenced by the
 * requirement constants below.
 */
export const securitySchemes = {
  projectToken: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "Project Token",
    description: [
      "Authenticate as a **project** with a project token.",
      "",
      "Send it as a bearer token in the `Authorization` header:",
      "",
      "```http",
      "Authorization: Bearer <project-token>",
      "```",
      "",
      "You can find your project token in your Argos project settings.",
      "Project tokens are used by CI and the SDK to create builds and",
      "deployments.",
    ].join("\n"),
  },
  personalAccessToken: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "Personal Access Token",
    description: [
      "Authenticate as a **user** with a personal access token.",
      "",
      "Send it as a bearer token in the `Authorization` header:",
      "",
      "```http",
      "Authorization: Bearer <personal-access-token>",
      "```",
      "",
      "Personal access tokens act on behalf of the user that created them",
      "and are required by endpoints that perform user actions, such as",
      "reviewing builds and posting comments.",
    ].join("\n"),
  },
} satisfies Record<string, ZodOpenApiSecuritySchemeObject>;

/** Name of a declared security scheme. */
type SecurityScheme = "projectToken" | "personalAccessToken";

/**
 * A security requirement list, structurally an OpenAPI `SecurityRequirementObject[]`
 * (so it is assignable to an operation's `security` field), carrying a phantom
 * `__auth` marker that records the payload type the requirement authenticates
 * to. The marker is type-only — it never exists at runtime — and is what
 * {@link AuthFromSecurity} reads to type `req.ctx.auth`.
 */
type SecurityRequirement<TAuth> = Record<string, string[]>[] & {
  readonly __auth?: TAuth;
};

/** The auth payload for an endpoint whose requirement isn't statically known. */
type UnknownAuth = AuthProjectPayload | AuthPATPayload | null;

/**
 * Authenticate with a **project token**. Used by the build and deployment
 * endpoints that act on behalf of a project (typically from CI or the SDK).
 */
export const projectTokenAuth: SecurityRequirement<AuthProjectPayload> = [
  { projectToken: [] },
];

/**
 * Authenticate with a **personal access token**. Used by endpoints that perform
 * user actions (reviews and comments), where the acting user's identity
 * matters.
 */
export const personalAccessTokenAuth: SecurityRequirement<AuthPATPayload> = [
  { personalAccessToken: [] },
];

/**
 * Accept **either** a project token or a personal access token. Used by
 * read-only endpoints that are reachable from both CI and a user.
 */
export const anyTokenAuth: SecurityRequirement<
  AuthProjectPayload | AuthPATPayload
> = [{ projectToken: [] }, { personalAccessToken: [] }];

/**
 * **No authentication.** Used by public endpoints and by the token-exchange
 * endpoints that mint a token in the first place.
 */
export const noAuth: SecurityRequirement<null> = [];

/**
 * The auth payload exposed on `req.ctx.auth`, derived from the operation's
 * declared `security` via its phantom `__auth` marker:
 *   - `noAuth` → `null`
 *   - `projectTokenAuth` → {@link AuthProjectPayload}
 *   - `personalAccessTokenAuth` → {@link AuthPATPayload}
 *   - `anyTokenAuth` → either payload
 *
 * Falls back to {@link UnknownAuth} for the erased `ZodOpenApiOperationObject`
 * type (used by the middleware, which builds a `ctx` before the concrete
 * operation type is known).
 */
export type AuthFromSecurity<TSecurity> = TSecurity extends {
  __auth?: infer TAuth;
}
  ? [unknown] extends [TAuth]
    ? UnknownAuth
    : TAuth
  : UnknownAuth;

/** Maps a resolved auth payload's `type` to the scheme that authorizes it. */
const AUTH_TYPE_TO_SCHEME = {
  project: "projectToken",
  pat: "personalAccessToken",
} as const satisfies Record<string, SecurityScheme>;

function unauthorizedMessage(allowedSchemes: Set<string>): string {
  if (
    allowedSchemes.has("personalAccessToken") &&
    !allowedSchemes.has("projectToken")
  ) {
    return "This endpoint requires a personal access token. See https://argos-ci.com/docs for details.";
  }
  return "This endpoint requires a project token. See https://argos-ci.com/docs for details.";
}

/**
 * Authenticate a request against an operation's declared `security`.
 *
 * Returns `null` for public endpoints (empty `security`). Otherwise it resolves
 * the bearer token to its payload and ensures the token's kind is allowed by
 * one of the declared schemes, throwing a `401` otherwise.
 *
 * Attribute binding (e.g. binding an OIDC token to a commit `sha`) is *not*
 * handled here because it depends on the request body or the loaded resource;
 * handlers assert it explicitly with `assertAuthAttributes`.
 */
export async function authenticateRequest(
  request: Request,
  security: readonly Record<string, unknown>[] | undefined,
): Promise<AuthProjectPayload | AuthPATPayload | null> {
  if (!security || security.length === 0) {
    return null;
  }

  const allowedSchemes = new Set(
    security.flatMap((requirement) => Object.keys(requirement)),
  );

  const auth = await getAuthPayloadFromExpressReq(request);

  if (!allowedSchemes.has(AUTH_TYPE_TO_SCHEME[auth.type])) {
    throw boom(401, unauthorizedMessage(allowedSchemes));
  }

  return auth;
}
