import { Knex } from "knex";

import type { Config } from "./index";

/**
 * Load the database configuration from a URL.
 */
export function loadDatabaseConfigFromURL(url: string, config: Config) {
  const urlObj = new URL(url);

  config.set("pg.connection.host", urlObj.hostname);
  config.set("pg.connection.port", urlObj.port);
  config.set("pg.connection.user", urlObj.username);
  config.set("pg.connection.password", urlObj.password);
  config.set("pg.connection.database", urlObj.pathname.substring(1));

  if (urlObj.hostname.endsWith("amazonaws.com")) {
    config.set("pg.connection.ssl", true);
  }
}

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
      password: config.get("pg.connection.password") || "",
      timezone: "utc",
      ssl: config.get("pg.connection.ssl")
        ? { rejectUnauthorized: false }
        : false,
    },
  };
}
