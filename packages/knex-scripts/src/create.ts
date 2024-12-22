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
 * Create the database based on the configuration in the knexfile.
 */
async function createDatabase() {
  preventRunningInProduction();

  const config = await getConfig();
  const env = getCommandEnv(config);
  const command = getCommand(config, "createdb");
  await runCommand(command, { env });
}

/**
 * Add the "create" command to the program.
 */
export function addCreateCommand(program: Command) {
  program
    .command("create")
    .description(
      "Create the database based on the configuration in the knexfile.",
    )
    .action(async () => {
      await oraPromise(createDatabase(), "Creating database...");
    });
}
