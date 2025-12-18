import Knex from "knex";

import config from "@/config";
import { getKnexConfig } from "@/config/database";

import { transaction } from "./transaction";

export const knex = Knex(getKnexConfig(config));
transaction.knex(knex);
