import { Command } from "commander";
import { oraPromise } from "ora";

import { getConfig } from "./config";
import {
  getCommandEnv,
  getPostgresCommand,
  preventRunningInProduction,
  runCommand,
} from "./utils";

/**
 * Load database schema from file.
 */
async function loadDatabaseSchema() {
  preventRunningInProduction();

  const config = await getConfig();

  const env = getCommandEnv(config);

  const { command, args } = getPostgresCommand(config, "psql", [
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    config.structurePath,
  ]);

  await runCommand({ command, args, env });
}

/**
 * Add the "load" command to the program.
 */
export function addLoadCommand(program: Command) {
  program
    .command("load")
    .description("Load the database schema from a file.")
    .action(async () => {
      await oraPromise(loadDatabaseSchema(), "Loading database schema…");
    });
}
