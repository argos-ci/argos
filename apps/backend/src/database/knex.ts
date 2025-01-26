import Knex from "knex";

import { getKnexConfig } from "@/config/database.js";
import config from "@/config/index.js";

import { transaction } from "./transaction.js";

export const knex = Knex(getKnexConfig(config));
transaction.knex(knex);
