import { Command } from "commander";
import Knex from "knex";
import { oraPromise } from "ora";

import { getConfig } from "./config";
import { preventRunningInProduction } from "./utils";

const KNEX_TABLES = ["knex_migrations", "knex_migrations_lock"];

let truncateQuery: string;

/**
 * Get the query to truncate the database.
 */
async function getTruncateQuery(knex: Knex.Knex) {
  if (!truncateQuery) {
    const result: { rows: { tablename: string }[] } = await knex.raw(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'",
    );

    const tables = result.rows.reduce<string[]>((_tables, { tablename }) => {
      return KNEX_TABLES.includes(tablename)
        ? _tables
        : [..._tables, tablename];
    }, []);

    const disableTriggers = tables.map(
      (table) => `ALTER TABLE ${table} DISABLE TRIGGER ALL`,
    );
    const deletes = tables.map((table) => `DELETE FROM ${table}`);
    const enableTriggers = tables.map(
      (table) => `ALTER TABLE ${table} ENABLE TRIGGER ALL`,
    );
    truncateQuery = [...disableTriggers, ...deletes, ...enableTriggers].join(
      ";",
    );
  }

  return truncateQuery;
}

/**
 * Truncate the database in a performant way.
 */
async function truncateDatabase() {
  preventRunningInProduction();

  const config = await getConfig();
  const knex = Knex(config.knexConfig);
  const query = await getTruncateQuery(knex);
  await knex.schema.raw(query);
  knex.destroy();
}

/**
 * Add the "truncate" command to the program.
 */
export function addTruncateCommand(program: Command) {
  program
    .command("truncate")
    .description("Truncate the database.")
    .action(async () => {
      await oraPromise(truncateDatabase(), "Truncating database...");
    });
}
