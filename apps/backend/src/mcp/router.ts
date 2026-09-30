/**
 * HTTP surface of the MCP server, served on its own subdomain
 * (`mcp.argos-ci.com`):
 *
 * - `POST /` — the MCP endpoint (Streamable HTTP, stateless), serving both the
 *   2026-07-28 protocol revision and 2025-era clients.
 * - `GET /` — humans and non-MCP clients are redirected to the documentation.
 * - `GET /.well-known/oauth-protected-resource` — RFC 9728 metadata pointing
 *   MCP clients at the Authorization Server (the OAuth discovery handshake).
 * - `GET /.well-known/mcp/server-card.json` — SEP-1649 Server Card for
 *   pre-connection discovery.
 *
 * Requests are authenticated with a personal access token or an OAuth access
 * token. Unauthenticated requests get a `401` with a `WWW-Authenticate` header
 * referencing the Protected Resource Metadata, which is what triggers the MCP
 * client authorization flow (DCR + consent).
 */
import { invariant } from "@argos/util/invariant";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
  createMcpHandler,
  ProtocolError,
  type McpServerFactory,
} from "@modelcontextprotocol/server";
import cors from "cors";
import express, {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

import { getAuthPayloadFromExpressReq } from "@/api/auth/project";
import { markAcceptedOAuthResources } from "@/auth/oauth-access-token";
import config from "@/config";
import logger from "@/logger";
import {
  getApiResourceUrl,
  getAuthorizationServerMetadata,
  getMcpProtectedResourceMetadataUrl,
  getMcpResourceUrl,
  getProtectedResourceMetadata,
} from "@/oauth/metadata";
import { createRedisStore } from "@/util/rate-limit";

import { asyncHandler } from "../web/util";
import { createMcpServer } from "./server";
import { getServerCard, MCP_DOCS_URL } from "./server-card";

const router: Router = Router();

// Permissive CORS is intentional: the MCP endpoint is a public API consumed
// by arbitrary MCP clients, authenticated with bearer tokens and no cookies —
// the same policy as the /oauth/* endpoints.
router.use(
  cors({
    origin: "*",
    exposedHeaders: ["WWW-Authenticate"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Mcp-Session-Id",
      "Mcp-Protocol-Version",
      "Mcp-Method",
      "Mcp-Name",
    ],
  }),
);

// RFC 9728 Protected Resource Metadata for the MCP server.
router.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json(getProtectedResourceMetadata(getMcpResourceUrl()));
});

// RFC 8414 Authorization Server Metadata, mirrored on the MCP origin: MCP
// clients on the pre-2025-06-18 authorization spec look it up here instead of
// following the Protected Resource Metadata to the AS.
router.get("/.well-known/oauth-authorization-server", (_req, res) => {
  res.json(getAuthorizationServerMetadata());
});

// SEP-1649 MCP Server Card: pre-connection discovery of the endpoint,
// transport and OAuth entry point.
router.get("/.well-known/mcp/server-card.json", (_req, res) => {
  res.json(getServerCard());
});

// Humans and non-MCP clients land here (the MCP protocol only POSTs).
router.get("/", (req, res) => {
  if (req.accepts(["text/event-stream", "html"]) === "text/event-stream") {
    // An MCP client probing for the SSE stream: the endpoint is stateless.
    res.set("Allow", "POST").sendStatus(405);
    return;
  }
  res.redirect(302, MCP_DOCS_URL);
});

router.delete("/", (_req, res) => {
  res.set("Allow", "POST").sendStatus(405);
});

type Caller =
  | { authenticated: true; rateLimitKey: string }
  | { authenticated: false; error: string };

const callers = new WeakMap<Request, Caller>();

async function resolveCaller(req: Request): Promise<Caller> {
  markAcceptedOAuthResources(req, [getMcpResourceUrl(), getApiResourceUrl()]);
  try {
    const auth = await getAuthPayloadFromExpressReq(req);
    if (auth.type === "project") {
      return {
        authenticated: false,
        error:
          "The MCP server requires a personal access token or an OAuth access token; project tokens are not accepted.",
      };
    }
    return {
      authenticated: true,
      rateLimitKey:
        auth.type === "oauth"
          ? `oauth-grant:${auth.grantId}`
          : `pat:${auth.tokenId}`,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : "Authentication required",
    };
  }
}

function getCaller(req: Request): Caller {
  const caller = callers.get(req);
  invariant(caller, "MCP caller read before it was resolved");
  return caller;
}

/**
 * Authenticate before rate-limiting, because the limiter needs to know who is
 * calling: hosted connectors (claude.ai, ChatGPT, Cursor) serve all their
 * users from a handful of egress IPs, and a budget per IP would be shared by
 * every one of those users. Tool calls re-authenticate inside the API layer.
 */
const identifyCaller = asyncHandler(async (req, _res, next) => {
  callers.set(req, await resolveCaller(req));
  next();
});

/**
 * An authenticated caller gets a budget per credential. Anything else is
 * budgeted by IP, which is what bounds a client retrying a dead token.
 */
const limiter = rateLimit({
  windowMs: config.get("api.rateLimit.window"),
  limit: config.get("api.rateLimit.limit"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("mcp"),
  keyGenerator: (req) => {
    const caller = getCaller(req);
    if (caller.authenticated) {
      return caller.rateLimitKey;
    }
    invariant(req.ip, "MCP request without a remote address");
    return ipKeyGenerator(req.ip);
  },
});

function sendUnauthorized(res: Response, message: string): void {
  res.set(
    "WWW-Authenticate",
    `Bearer error="invalid_token", resource_metadata="${getMcpProtectedResourceMetadataUrl()}"`,
  );
  res.status(401).json({ error: message });
}

/**
 * Unauthenticated clients get the `401` + `WWW-Authenticate` handshake before
 * reaching the protocol, and project tokens a clear message.
 */
const requireAuthentication: RequestHandler = (req, res, next) => {
  const caller = getCaller(req);
  if (!caller.authenticated) {
    sendUnauthorized(res, caller.error);
    return;
  }
  next();
};

const createServerForRequest: McpServerFactory = ({ requestInfo }) => {
  invariant(requestInfo, "MCP server created outside of an HTTP request");
  // `requireAuthentication` runs first and rejects any request without a
  // resolvable bearer, so the header is guaranteed to be present here.
  const authorization = requestInfo.headers.get("authorization");
  invariant(authorization, "authenticated MCP request without a bearer token");
  return createMcpServer({ authorization });
};

/**
 * Besides its own failures, which it answers with a 500, the SDK reports every
 * request it turns away: a protocol revision it does not serve, a request
 * breaking the transport rules, a content type other than JSON. Those are for
 * the client to fix. Some come as plain errors, matched on their message: a
 * rewording sends them back to Sentry, it never hides a failure.
 */
function reportMcpError(error: Error): void {
  if (
    error instanceof ProtocolError ||
    error.message.startsWith("Rejected inbound request") ||
    error.message.startsWith("Unsupported Media Type")
  ) {
    logger.warn({ error, reportToSentry: false }, "MCP request rejected");
    return;
  }
  logger.error({ error }, "MCP request failed");
}

// Every request gets a fresh server from the factory, whatever its protocol
// era, so concurrent requests never collide and no session state has to be
// replicated across instances.
const handleMcpRequest = toNodeHandler(
  createMcpHandler(createServerForRequest, { onerror: reportMcpError }),
  { onerror: reportMcpError },
);

router.post(
  "/",
  identifyCaller,
  limiter,
  requireAuthentication,
  express.json({ limit: "1mb" }),
  asyncHandler((req: Request, res: Response) =>
    handleMcpRequest(req, res, req.body),
  ),
);

export { router as mcpRouter };
