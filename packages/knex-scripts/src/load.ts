import { Command } from "commander";
import { oraPromise } from "ora";

import { getConfig } from "./config.js";
import {
  getCommand,
  getCommandEnv,
  preventRunningInProduction,
  runCommand,
} from "./utils.js";

/**
 * Load database schema from file.
 */
async function loadDatabaseSchema() {
  preventRunningInProduction();

  const config = await getConfig();

  const env = getCommandEnv(config);
  const command = `${getCommand(
    config,
    "psql",
  )} -v ON_ERROR_STOP=1 -f ${config.structurePath}`;

  await runCommand(command, { env });
}

/**
 * Add the "load" command to the program.
 */
export function addLoadCommand(program: Command) {
  program
    .command("load")
    .description("Load the database schema from a file.")
    .action(async () => {
      await oraPromise(loadDatabaseSchema(), "Loading database schema...");
    });
}
