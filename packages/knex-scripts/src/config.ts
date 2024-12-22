import { join } from "node:path";
import type { Knex } from "knex";

type Config = {
  knexConfig: Knex.Config;
  structurePath: string;
  migrationsPath: string;
};

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

export async function getConfig(): Promise<Config> {
  const knexConfig = await readKnexConfig();
  return {
    knexConfig,
    structurePath: join(process.cwd(), "db/structure.sql"),
    migrationsPath: join(process.cwd(), "db/migrations"),
  };
}
