// eslint-disable-next-line import/no-named-as-default
import Knex from "knex";

import config from "@/config/index.js";

import { transaction } from "./transaction.js";

const createKnex = typeof Knex === "function" ? Knex : Knex.default;

export const knex = createKnex(config.get("pg"));
transaction.knex(knex);

// process.on("SIGTERM", () => {
//   knex.destroy();
// });
