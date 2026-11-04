import { describe, expect, it } from "vitest";

import { createConfig } from ".";
import { getKnexConfig } from "./database";

function knexConfigFor(host: string, ssl: boolean) {
  const config = createConfig();
  config.set("pg.connection.host", host);
  config.set("pg.connection.ssl", ssl);
  return getKnexConfig(config);
}

describe("getKnexConfig", () => {
  it("verifies the certificate of an RDS instance", () => {
    expect(
      knexConfigFor("argos.abc123.us-east-1.rds.amazonaws.com", true)
        .connection,
    ).toMatchObject({
      ssl: {
        rejectUnauthorized: true,
        ca: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
      },
    });
  });

  it("refuses an RDS instance whose certificate authority does not ship", () => {
    expect(() =>
      knexConfigFor("argos.abc123.eu-west-1.rds.amazonaws.com", true),
    ).toThrow(/only covers us-east-1/);
  });

  it("connects to a local database without TLS", () => {
    expect(knexConfigFor("127.0.0.1", false).connection).toMatchObject({
      ssl: false,
    });
  });
});
