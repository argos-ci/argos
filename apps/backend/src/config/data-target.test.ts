import { describe, expect, it } from "vitest";

import { assertSafeDataTarget } from "./data-target";

const base = {
  target: "local",
  env: "development",
  pgHost: "127.0.0.1",
  pgUser: "postgres",
  redisUrl: "redis://localhost:6380/1",
  amqpUrl: "amqp://localhost",
  writeCapableSecrets: [],
} satisfies Parameters<typeof assertSafeDataTarget>[0];

describe("assertSafeDataTarget", () => {
  it("accepts a local development setup", () => {
    expect(() => assertSafeDataTarget(base)).not.toThrow();
  });

  it("accepts production pointing at RDS", () => {
    expect(() =>
      assertSafeDataTarget({
        ...base,
        env: "production",
        pgHost: "db.abc123.eu-west-1.rds.amazonaws.com",
      }),
    ).not.toThrow();
  });

  it.each(["development", "test"] as const)(
    "fails closed when %s reaches an AWS database without prod-ro",
    (env) => {
      expect(() =>
        assertSafeDataTarget({
          ...base,
          env,
          pgHost: "db.abc123.eu-west-1.rds.amazonaws.com",
        }),
      ).toThrow(/ARGOS_TARGET/);
    },
  );

  describe("with ARGOS_TARGET=prod-ro", () => {
    const prodRo = {
      ...base,
      target: "prod-ro",
      pgHost: "db.abc123.eu-west-1.rds.amazonaws.com",
      pgUser: "argos_dev_ro",
    } satisfies Parameters<typeof assertSafeDataTarget>[0];

    it("accepts the expected setup", () => {
      expect(() => assertSafeDataTarget(prodRo)).not.toThrow();
    });

    // The read-only grants live on one role, so connecting as any other — the
    // application's own role above all — silently removes the write barrier.
    it.each(["argos", "postgres", "argos_dev"])(
      "rejects connecting as %s",
      (pgUser) => {
        expect(() => assertSafeDataTarget({ ...prodRo, pgUser })).toThrow(
          /must connect as the read-only role "argos_dev_ro"/,
        );
      },
    );

    it.each(["production", "test"] as const)("rejects NODE_ENV=%s", (env) => {
      expect(() => assertSafeDataTarget({ ...prodRo, env })).toThrow(
        /NODE_ENV/,
      );
    });

    it("rejects a remote Redis", () => {
      expect(() =>
        assertSafeDataTarget({
          ...prodRo,
          redisUrl: "redis://prod.cache.amazonaws.com:6379",
        }),
      ).toThrow(/REDIS_URL/);
    });

    it("rejects a remote RabbitMQ", () => {
      expect(() =>
        assertSafeDataTarget({
          ...prodRo,
          amqpUrl: "amqps://b-1234.mq.eu-west-1.amazonaws.com:5671",
        }),
      ).toThrow(/AMQP_URL/);
    });

    it("rejects an unparsable queue URL rather than letting it through", () => {
      expect(() =>
        assertSafeDataTarget({ ...prodRo, amqpUrl: "not a url" }),
      ).toThrow(/AMQP_URL/);
    });

    it("rejects write-capable third-party credentials", () => {
      expect(() =>
        assertSafeDataTarget({
          ...prodRo,
          writeCapableSecrets: ["RESEND_API_KEY", "STRIPE_API_KEY"],
        }),
      ).toThrow(/RESEND_API_KEY, STRIPE_API_KEY/);
    });
  });
});
