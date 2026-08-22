import { getKnexConfig } from "./dist/config/database.js";
import config from "./dist/config/index.js";

// Everything that goes through the knexfile — migrations, knex-scripts
// (create/drop/truncate/dump) — mutates the database schema or content, and
// none of it may ever run against production data.
if (config.get("target") === "prod-ro") {
  throw new Error(
    "ARGOS_TARGET=prod-ro: migrations and database scripts are disabled against production data.",
  );
}

export default getKnexConfig(config);
