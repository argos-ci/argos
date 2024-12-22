import { appendFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { Command } from "commander";
import { oraPromise } from "ora";

import { getConfig } from "./config.js";
import {
  getCommandEnv,
  getInsertsFromMigrations,
  getPostgresCommand,
  requireEnv,
  runCommand,
} from "./utils.js";

/**
 * Dump the database schema to a file.
 */
async function dumpDatabaseSchema() {
  const config = await getConfig();
  requireEnv("development");

  await mkdir(dirname(config.structurePath), { recursive: true });

  const env = getCommandEnv(config);
  const { command, args } = getPostgresCommand(config, "pg_dump", [
    "--schema-only",
    "-f",
    config.structurePath,
  ]);

  await runCommand({ command, args, env });

  const migrationInserts = await getInsertsFromMigrations(config);
  await appendFile(
    config.structurePath,
    `-- Knex migrations\n\n${migrationInserts.join("\n")}`,
  );
}

/**
 * Add the "dump" command to the program.
 */
export function addDumpCommand(program: Command) {
  program
    .command("dump")
    .description("Dump the database schema to a file.")
    .action(async () => {
      await oraPromise(dumpDatabaseSchema(), "Dumping database schema...");
    });
}
