import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import type { RequestListener, Server } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import config from "@argos-ci/config";
import logger from "@argos-ci/logger";
import { createApp } from "@argos-ci/web";

import { setup } from "../setup.js";

setup();

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const createServer = (requestListener: RequestListener): Server => {
  if (config.get("env") === "development") {
    return createHttpsServer(
      {
        key: readFileSync(
          join(__dirname, "../../../../_wildcard.argos-ci.dev-key.pem")
        ),
        cert: readFileSync(
          join(__dirname, "../../../../_wildcard.argos-ci.dev.pem")
        ),
      },
      requestListener
    );
  }

  return createHttpServer(requestListener);
};

const app = await createApp();
const server = createServer(app);

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
