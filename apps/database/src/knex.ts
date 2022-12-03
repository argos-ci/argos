import { knex as createKnex } from "knex";

import config from "@argos-ci/config";

import { transaction } from "./transaction.js";

export const knex = createKnex(config.get("pg"));
transaction.knex(knex);

process.on("SIGTERM", () => {
  knex.destroy();
});
