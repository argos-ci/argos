import { describe, expect, it } from "vitest";

import {
  DEFAULT_RETRY_LADDER,
  getRetryQueueName,
  getRetryQueueOptions,
  getRetryTier,
} from "./backoff";

const LADDER = [
  { label: "10s", delay: 10_000 },
  { label: "1m", delay: 60_000 },
];

describe("getRetryTier", () => {
  it("picks the tier matching the number of attempts already made", () => {
    expect(getRetryTier(LADDER, 0)).toEqual({ label: "10s", delay: 10_000 });
    expect(getRetryTier(LADDER, 1)).toEqual({ label: "1m", delay: 60_000 });
  });

  it("returns null once the ladder is exhausted", () => {
    expect(getRetryTier(LADDER, 2)).toBeNull();
    expect(getRetryTier(LADDER, 99)).toBeNull();
  });

  it("returns null for an empty ladder, disabling retries", () => {
    expect(getRetryTier([], 0)).toBeNull();
  });
});

describe("getRetryQueueName", () => {
  it("derives the delay queue name from the job queue and the tier label", () => {
    expect(
      getRetryQueueName("test:build", { label: "10s", delay: 10_000 }),
    ).toBe("test:build.retry.10s");
  });

  it("gives each tier its own queue so delays never share a TTL", () => {
    const names = DEFAULT_RETRY_LADDER.map((tier) =>
      getRetryQueueName("build", tier),
    );

    expect(names).toEqual([
      "build.retry.10s",
      "build.retry.1m",
      "build.retry.5m",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("getRetryQueueOptions", () => {
  it("expires messages back onto the job queue after the tier delay", () => {
    const options = getRetryQueueOptions("test:build", {
      label: "10s",
      delay: 10_000,
    });

    expect(options.messageTtl).toBe(10_000);
    // The default exchange routes by queue name, so this lands the expired
    // message back on the job queue.
    expect(options.deadLetterExchange).toBe("");
    expect(options.deadLetterRoutingKey).toBe("test:build");
    expect(options.durable).toBe(true);
  });

  it("keeps the dead-letter hop lossless", () => {
    const options = getRetryQueueOptions("build", {
      label: "5m",
      delay: 300_000,
    });

    expect(options.arguments).toMatchObject({
      "x-queue-type": "quorum",
      "x-dead-letter-strategy": "at-least-once",
    });
    // at-least-once dead-lettering is rejected by RabbitMQ without it.
    expect(options.overflow).toBe("reject-publish");
  });
});
