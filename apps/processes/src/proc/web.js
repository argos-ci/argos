import "../setup";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import config from "@argos-ci/config";
import { app } from "@argos-ci/web";
import logger from "@argos-ci/logger";

const server =
  config.get("env") === "development"
    ? https.createServer(
        {
          key: fs.readFileSync(
            path.join(__dirname, "../../../../_wildcard.argos-ci.dev-key.pem")
          ),
          cert: fs.readFileSync(
            path.join(__dirname, "../../../../_wildcard.argos-ci.dev.pem")
          ),
        },
        app
      )
    : http.createServer(app);

server.listen(config.get("server.port"), (err) => {
  if (err) throw err;
  logger.info(`Ready on http://localhost:${server.address().port}`);
});

process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) throw err;
  });
});
