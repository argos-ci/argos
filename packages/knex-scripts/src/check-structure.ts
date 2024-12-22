import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { oraPromise } from "ora";

import { getConfig } from "./config.js";
import { getInsertsFromMigrations } from "./utils.js";

/**
 * Get inserts from the structure file.
 */
async function getInsertsFromStructure(input: {
  structurePath: string;
}): Promise<string[]> {
  const structure = await readFile(input.structurePath, "utf-8");
  const regex =
    /INSERT INTO public\.knex_migrations\(name, batch, migration_time\) VALUES \('.*', 1, NOW\(\)\);/g;
  const inserts = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(structure))) {
    inserts.push(match[0]);
  }

  return inserts;
}

/**
 * Check if the structure is up to date.
 */
async function checkIsStructureUpToDate() {
  const config = await getConfig();
  const [migrationsInFolder, migrationsInStructure] = await Promise.all([
    getInsertsFromMigrations(config),
    getInsertsFromStructure(config),
  ]);

  if (migrationsInFolder.length !== migrationsInStructure.length) {
    return false;
  }

  return migrationsInFolder.every(
    (insert, index) => migrationsInStructure[index] === insert,
  );
}

export function addCheckStructureCommand(program: Command) {
  program
    .command("check-structure")
    .description(
      "Compare the dumped structure with the structure in the database.",
    )
    .action(async () => {
      await oraPromise(
        (async () => {
          const isUpToDate = await checkIsStructureUpToDate();
          if (!isUpToDate) {
            throw new Error("Structure is outdated.");
          }
        })(),
        "Checking structure...",
      );
    });
}
