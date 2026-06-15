import type { Server } from "node:http";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";

import config from "@/config";
import parentLogger from "@/logger";

import { getWebSocketContext } from "./context";
import { schema } from "./schema";

const logger = parentLogger.child({ module: "graphql-ws" });

/**
 * Only accept WebSocket upgrades coming from our own app. The session cookie is
 * sent automatically on the upgrade request and — unlike the HTTP transport — a
 * WebSocket handshake cannot carry our CSRF header, so we guard against
 * cross-site WebSocket hijacking by validating the Origin against the
 * configured public URL and wildcard domains.
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  // Non-browser clients omit Origin and are not subject to cross-site
  // hijacking (they carry no ambient cookies); browsers always send it.
  if (!origin) {
    return true;
  }
  // Compare on hostname (not host) so the port the app runs on — e.g. the Vite
  // dev server proxying to the backend — does not cause a false rejection.
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (hostname === new URL(config.get("server.url")).hostname) {
    return true;
  }
  return config
    .get("server.wildcardDomains")
    .some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * Attach a graphql-ws WebSocket server to the HTTP server so GraphQL
 * subscriptions are served over `/graphql` — the same path as queries and
 * mutations, since WebSocket upgrades and plain HTTP requests do not collide.
 */
export function createGraphQLWebSocketServer(httpServer: Server): void {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer(
    {
      schema,
      context: (ctx) => getWebSocketContext(ctx.extra.request),
      onConnect: (ctx) => {
        const { origin } = ctx.extra.request.headers;
        if (!isAllowedOrigin(origin)) {
          logger.warn(
            { origin },
            "Rejected WebSocket connection from disallowed origin",
          );
          return false;
        }
        return true;
      },
    },
    wsServer,
  );
}
