/**
 * HTTP surface of the MCP server, served on its own subdomain
 * (`mcp.argos-ci.com`):
 *
 * - `POST /` — the MCP endpoint (streamable HTTP transport, stateless).
 * - `GET /` — humans and non-MCP clients are redirected to the documentation.
 * - `GET /.well-known/oauth-protected-resource` — RFC 9728 metadata pointing
 *   MCP clients at the Authorization Server (the OAuth discovery handshake).
 *
 * Requests are authenticated with a personal access token or an OAuth access
 * token. Unauthenticated requests get a `401` with a `WWW-Authenticate` header
 * referencing the Protected Resource Metadata, which is what triggers the MCP
 * client authorization flow (DCR + consent).
 */
import { invariant } from "@argos/util/invariant";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import cors from "cors";
import express, { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";

import { getAuthPayloadFromExpressReq } from "@/api/auth/project";
import { markAcceptedOAuthResources } from "@/auth/oauth-access-token";
import config from "@/config";
import {
  getApiResourceUrl,
  getMcpProtectedResourceMetadataUrl,
  getMcpResourceUrl,
  getProtectedResourceMetadata,
} from "@/oauth/metadata";
import { createRedisStore } from "@/util/rate-limit";

import { asyncHandler } from "../web/util";
import { createMcpServer } from "./server";

const MCP_DOCS_URL = "https://argos-ci.com/docs/agents/mcp-server";

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
    ],
  }),
);

// RFC 9728 Protected Resource Metadata for the MCP server.
router.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json(getProtectedResourceMetadata(getMcpResourceUrl()));
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

const limiter = rateLimit({
  windowMs: config.get("api.rateLimit.window"),
  limit: config.get("api.rateLimit.limit"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("mcp"),
});

function sendUnauthorized(res: Response, message: string): void {
  res.set(
    "WWW-Authenticate",
    `Bearer error="invalid_token", resource_metadata="${getMcpProtectedResourceMetadataUrl()}"`,
  );
  res.status(401).json({ error: message });
}

/**
 * Authenticate the MCP request. Tool calls re-authenticate inside the API
 * layer; this gate exists so unauthenticated clients get the `401` +
 * `WWW-Authenticate` handshake before reaching the protocol, and so project
 * tokens are rejected with a clear message.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  markAcceptedOAuthResources(req, [getMcpResourceUrl(), getApiResourceUrl()]);
  try {
    const auth = await getAuthPayloadFromExpressReq(req);
    if (auth.type === "project") {
      sendUnauthorized(
        res,
        "The MCP server requires a personal access token or an OAuth access token; project tokens are not accepted.",
      );
      return;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication required";
    sendUnauthorized(res, message);
    return;
  }
  next();
});

router.post(
  "/",
  limiter,
  express.json({ limit: "1mb" }),
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // `authenticate` runs first and rejects any request without a resolvable
    // bearer, so the header is guaranteed to be present here.
    const authorization = req.headers.authorization;
    invariant(
      authorization,
      "authenticated MCP request without a bearer token",
    );
    // Stateless mode (no `sessionIdGenerator`): a fresh server + transport
    // pair per request, so concurrent requests never collide and no session
    // state has to be replicated across instances.
    const server = createMcpServer({ authorization });
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    // Cast: the SDK types `onclose` as `(() => void) | undefined`, which is
    // not assignable to the optional `onclose?` of `Transport` under
    // `exactOptionalPropertyTypes`.
    await server.connect(transport as unknown as Transport);
    await transport.handleRequest(req, res, req.body);
  }),
);

export { router as mcpRouter };
