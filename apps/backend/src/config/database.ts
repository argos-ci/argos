import { Knex } from "knex";

import type { Config } from ".";

/**
 * Get the Knex configuration from the application configuration.
 */
export function getKnexConfig(config: Config): Knex.Config {
  return {
    client: "postgresql",
    migrations: {
      directory: config.get("pg.migrations.directory"),
    },
    pool: {
      min: config.get("pg.pool.min"),
      max: config.get("pg.pool.max"),
    },
    connection: {
      database: config.get("pg.connection.database"),
      host: config.get("pg.connection.host"),
      user: config.get("pg.connection.user"),
      port: config.get("pg.connection.port"),
      password: config.get("pg.connection.password") || "",
      timezone: "utc",
      ssl: config.get("pg.connection.ssl")
        ? { rejectUnauthorized: false }
        : false,
    },
  };
}
