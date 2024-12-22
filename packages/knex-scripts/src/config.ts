import { join } from "node:path";
import type { Knex } from "knex";

export type Config = {
  knexConfig: Knex.Config;
  structurePath: string;
};

const STRUCTURE_PATH = join(process.cwd(), "db/structure.sql");
const MIGRATIONS_PATH = join(process.cwd(), "db/migrations");

async function readKnexConfig(): Promise<Knex.Config> {
  const knexFile = join(process.cwd(), "knexfile.js");
  try {
    const config: unknown = await import(knexFile);
    if (
      !config ||
      typeof config !== "object" ||
      !("default" in config) ||
      !config.default
    ) {
      throw new Error(`Invalid knexfile.js`);
    }
    return config.default;
  } catch {
    throw new Error(`Could not find ${knexFile}`);
  }
}

export async function getConfig() {
  const knexConfig = await readKnexConfig();
  return {
    knexConfig,
    structurePath: STRUCTURE_PATH,
    migrationsPath: MIGRATIONS_PATH,
  };
}
