// eslint-disable-next-line import/no-named-as-default
import Knex from "knex";

import config from "@argos-ci/config";

import { transaction } from "./transaction.js";

export const knex = Knex.default(config.get("pg"));
transaction.knex(knex);

process.on("SIGTERM", () => {
  knex.destroy();
});
