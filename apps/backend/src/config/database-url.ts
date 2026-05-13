import type { Config } from ".";

/**
 * Load the database configuration from a URL.
 */
export function loadDatabaseConfigFromURL(url: string, config: Config) {
  const urlObj = new URL(url);

  config.set("pg.connection.host", urlObj.hostname);
  config.set("pg.connection.port", urlObj.port ? Number(urlObj.port) : 5432);
  config.set("pg.connection.user", urlObj.username);
  config.set("pg.connection.password", urlObj.password);
  config.set("pg.connection.database", urlObj.pathname.substring(1));

  const hostnameParts = urlObj.hostname.split(".");
  const baseDomain = hostnameParts.slice(-2).join(".");
  // If the database is hosted on AWS, enable SSL.
  config.set("pg.connection.ssl", baseDomain === "amazonaws.com");
}
