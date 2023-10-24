// eslint-disable-next-line import/no-named-as-default
import Knex from "knex";

import config from "@/config/index.js";

import { transaction } from "./transaction.js";

export const knex = Knex(config.get("pg"));
transaction.knex(knex);

// process.on("SIGTERM", () => {
//   knex.destroy();
// });
