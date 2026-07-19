import { isAllowedRedirectUri } from "@argos/util/url";
import * as Sentry from "@sentry/node";
import cors from "cors";
import express, { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { OAuthClient } from "@/database/models";
import { createRedisStore } from "@/util/rate-limit";

import { consumeAuthorizationCode } from "./authorization-code";
import {
  createDynamicClient,
  getClientByClientId,
  isConfidentialClient,
  verifyClientSecret,
} from "./clients";
import { getAuthorizationServerMetadata, getOAuthIssuer } from "./metadata";
import { isOAuthScope, parseScopeString, type OAuthScope } from "./scopes";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  introspectToken,
  issueTokens,
  revokeToken,
  rotateRefreshToken,
} from "./tokens";

/**
 * OAuth 2.1 Authorization Server HTTP endpoints (token / register / introspect /
 * revoke), mounted under `/oauth` on the app-domain server. They are
 * client-/PKCE-authenticated (never cookie/session), so this sub-router uses
 * permissive CORS and no CSRF, scoped to `/oauth` only.
 *
 * The browser-facing `GET /oauth/authorize` consent screen is intentionally
 * *not* defined here — it is a React route served by the SPA catch-all, and
 * unmatched requests fall through to it.
 */
const oauthApiRouter: Router = Router();

oauthApiRouter.use(cors({ origin: "*" }));
oauthApiRouter.use(express.urlencoded({ extended: false }));
oauthApiRouter.use(express.json());

type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_scope"
  | "invalid_target"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "server_error";

function sendError(
  res: Response,
  status: number,
  error: OAuthErrorCode,
  description?: string,
) {
  res
    .status(status)
    .json(description ? { error, error_description: description } : { error });
}

function parseBasicAuth(
  header: string | undefined,
): { clientId: string; clientSecret: string } | null {
  if (!header) {
    return null;
  }
  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) {
    return null;
  }
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx === -1) {
    return null;
  }
  return {
    clientId: decodeURIComponent(decoded.slice(0, idx)),
    clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
  };
}

/**
 * Resolve and authenticate the client from a token/introspection/revocation
 * request (Basic header or request body). Confidential clients must present a
 * valid secret; public clients only need to exist.
 */
async function authenticateClient(
  req: Request,
): Promise<
  { ok: true; client: OAuthClient } | { ok: false; description: string }
> {
  const basic = parseBasicAuth(req.headers.authorization);
  const clientId = basic?.clientId ?? req.body?.client_id;
  const clientSecret = basic?.clientSecret ?? req.body?.client_secret ?? null;

  if (typeof clientId !== "string" || !clientId) {
    return { ok: false, description: "Missing client_id." };
  }
  const client = await getClientByClientId(clientId);
  if (!client) {
    return { ok: false, description: "Unknown client." };
  }
  if (
    isConfidentialClient(client) &&
    !verifyClientSecret(
      client,
      typeof clientSecret === "string" ? clientSecret : null,
    )
  ) {
    return { ok: false, description: "Invalid client credentials." };
  }
  return { ok: true, client };
}

function sendTokenResponse(
  res: Response,
  accessToken: string,
  refreshToken: string,
  scopes: OAuthScope[],
) {
  // Access/refresh tokens must never be cached.
  res.set("Cache-Control", "no-store");
  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope: scopes.join(" "),
  });
}

oauthApiRouter.post("/token", async (req: Request, res: Response) => {
  const grantType = req.body?.grant_type;

  const auth = await authenticateClient(req);
  if (!auth.ok) {
    sendError(res, 401, "invalid_client", auth.description);
    return;
  }
  const { client } = auth;

  if (grantType === "authorization_code") {
    const code = req.body?.code;
    const redirectUri = req.body?.redirect_uri;
    const codeVerifier = req.body?.code_verifier;
    if (
      typeof code !== "string" ||
      typeof redirectUri !== "string" ||
      typeof codeVerifier !== "string"
    ) {
      sendError(
        res,
        400,
        "invalid_request",
        "code, redirect_uri and code_verifier are required.",
      );
      return;
    }
    const payload = await consumeAuthorizationCode({
      code,
      codeVerifier,
      clientId: client.clientId,
      redirectUri,
    });
    if (!payload) {
      sendError(
        res,
        400,
        "invalid_grant",
        "Invalid or expired authorization code.",
      );
      return;
    }
    const scopes = payload.scopes.filter(isOAuthScope);
    const tokens = await issueTokens({
      grantId: payload.grantId,
      scopes,
      resource: payload.resource,
    });
    sendTokenResponse(res, tokens.accessToken, tokens.refreshToken, scopes);
    return;
  }

  if (grantType === "refresh_token") {
    const refreshToken = req.body?.refresh_token;
    if (typeof refreshToken !== "string") {
      sendError(res, 400, "invalid_request", "refresh_token is required.");
      return;
    }
    const requestedScopes: OAuthScope[] | null =
      typeof req.body?.scope === "string"
        ? parseScopeString(req.body.scope)
        : null;
    const resource =
      typeof req.body?.resource === "string" ? req.body.resource : null;
    const result = await rotateRefreshToken({
      refreshToken,
      clientId: client.clientId,
      requestedScopes,
      resource,
    });
    if (!result.ok) {
      sendError(
        res,
        400,
        result.error,
        result.error === "invalid_scope"
          ? "Requested scope exceeds the original grant."
          : result.error === "invalid_target"
            ? "Unknown resource."
            : "Invalid or expired refresh token.",
      );
      return;
    }
    sendTokenResponse(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.scopes,
    );
    return;
  }

  sendError(
    res,
    400,
    "unsupported_grant_type",
    `Unsupported grant_type: ${grantType}`,
  );
});

const RegistrationSchema = z.object({
  client_name: z.string().min(1).max(255),
  redirect_uris: z.array(z.url()).min(1),
  client_uri: z.url().optional(),
  logo_uri: z.url().optional(),
  software_id: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  scope: z.string().optional(),
  token_endpoint_auth_method: z
    .enum(["none", "client_secret_basic", "client_secret_post"])
    .optional(),
});

/**
 * Dynamic Client Registration is unauthenticated (RFC 7591), so cap it per IP
 * to prevent anonymous clients from spamming the `oauth_clients` table.
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("oauth-register"),
  handler: (_req, res) => {
    sendError(
      res,
      429,
      "invalid_request",
      "Too many client registrations. Try again later.",
    );
  },
});

oauthApiRouter.post(
  "/register",
  registrationLimiter,
  async (req: Request, res: Response) => {
    const parsed = RegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "invalid_request", "Invalid client metadata.");
      return;
    }
    const meta = parsed.data;
    if (!meta.redirect_uris.every(isAllowedRedirectUri)) {
      sendError(
        res,
        400,
        "invalid_request",
        "redirect_uris must use https, a loopback http address, or a private-use scheme.",
      );
      return;
    }

    const { client, clientSecret, registrationAccessToken } =
      await createDynamicClient({
        clientName: meta.client_name,
        redirectUris: meta.redirect_uris,
        clientUri: meta.client_uri ?? null,
        logoUri: meta.logo_uri ?? null,
        softwareId: meta.software_id ?? null,
        grantTypes: meta.grant_types,
        responseTypes: meta.response_types,
        scope: meta.scope ?? null,
        tokenEndpointAuthMethod: meta.token_endpoint_auth_method,
      });

    res.status(201).json({
      client_id: client.clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      client_id_issued_at: Math.floor(
        new Date(client.createdAt).getTime() / 1000,
      ),
      client_secret_expires_at: 0,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      ...(client.scope ? { scope: client.scope } : {}),
      registration_access_token: registrationAccessToken,
      registration_client_uri: `${getOAuthIssuer()}/oauth/register/${client.clientId}`,
    });
  },
);

oauthApiRouter.post("/introspect", async (req: Request, res: Response) => {
  // Introspection is for resource servers, which authenticate as a confidential
  // client (RFC 7662 §2.1).
  const auth = await authenticateClient(req);
  if (!auth.ok || !isConfidentialClient(auth.client)) {
    sendError(res, 401, "invalid_client", "Client authentication required.");
    return;
  }
  const token = req.body?.token;
  if (typeof token !== "string") {
    res.json({ active: false });
    return;
  }
  res.json(await introspectToken(token));
});

oauthApiRouter.post("/revoke", async (req: Request, res: Response) => {
  const auth = await authenticateClient(req);
  if (!auth.ok) {
    sendError(res, 401, "invalid_client", auth.description);
    return;
  }
  const token = req.body?.token;
  if (typeof token === "string") {
    await revokeToken(token);
  }
  // RFC 7009: respond 200 regardless of whether the token was known.
  res.status(200).end();
});

// Central error handler so unexpected failures don't leak internals.
oauthApiRouter.use(
  (err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    Sentry.captureException(err);
    if (!res.headersSent) {
      sendError(res, 500, "server_error", "Unexpected error.");
    }
  },
);

/**
 * Mount the Authorization Server on the app-domain router: the RFC 8414 metadata
 * document at the well-known path, and the `/oauth/*` endpoints. Must be
 * installed before the SPA catch-all.
 */
export function mountOAuthServer(parent: Router): void {
  parent.get(
    "/.well-known/oauth-authorization-server",
    cors({ origin: "*" }),
    (_req: Request, res: Response) => {
      res.json(getAuthorizationServerMetadata());
    },
  );
  parent.use("/oauth", oauthApiRouter);
}
