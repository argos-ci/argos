import Knex from "knex";

import config, { type Config } from "@/config";
import { getKnexConfig } from "@/config/database";

import { transaction } from "./transaction";

function getKnexFromConfig(config: Config) {
  return Knex(getKnexConfig(config));
}

export const knex = getKnexFromConfig(config);
transaction.knex(knex);
