import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import { callbackify } from "util";

import config from "@argos-ci/config";
import logger from "@argos-ci/logger";
import { createApp } from "@argos-ci/web";

import "../setup";

const createHttpServer = (requestListener) => {
  if (config.get("env") === "development") {
    return https.createServer(
      {
        key: fs.readFileSync(
          path.join(__dirname, "../../../../_wildcard.argos-ci.dev-key.pem")
        ),
        cert: fs.readFileSync(
          path.join(__dirname, "../../../../_wildcard.argos-ci.dev.pem")
        ),
      },
      requestListener
    );
  }

  return http.createServer(requestListener);
};

async function main() {
  const app = await createApp();
  const server = createHttpServer(app);

  server.listen(config.get("server.port"), (err) => {
    if (err) throw err;
    logger.info(`Ready on http://localhost:${server.address().port}`);
  });

  process.on("SIGTERM", () => {
    server.close((err) => {
      if (err) throw err;
    });
  });
}

callbackify(main)((err) => {
  if (err) throw err;
});
