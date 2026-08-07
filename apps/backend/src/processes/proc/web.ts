import "../setup";
import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import type { RequestListener, Server } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { invariant } from "@argos/util/invariant";

import config from "@/config";
import { createGraphQLWebSocketServer } from "@/graphql";
import logger from "@/logger";
import { resolveFromRepositoryRoot } from "@/util/paths";
import { createApp } from "@/web";

const createServer = (requestListener: RequestListener): Server => {
  if (config.get("env") === "development") {
    const keyPath = resolveFromRepositoryRoot("_wildcard.argos-ci.dev-key.pem");
    const certPath = resolveFromRepositoryRoot("_wildcard.argos-ci.dev.pem");
    invariant(
      keyPath && certPath,
      "development TLS certificates not found — run from within the repository",
    );
    return createHttpsServer(
      { key: readFileSync(keyPath), cert: readFileSync(certPath) },
      requestListener,
    );
  }

  return createHttpServer(requestListener);
};

const app = await createApp();
const server = createServer(app);

// Serve GraphQL subscriptions over WebSocket on the same server/path.
createGraphQLWebSocketServer(server);

server.listen(config.get("server.port"), () => {
  logger.info(`Ready on http://localhost:${config.get("server.port")}`);
});

// process.on("SIGTERM", () => {
//   if (server.listening) {
//     server.close((err) => {
//       if (err) throw err;
//     });
//   }
// });
