import type { Options } from "amqplib";

/**
 * One step of the retry backoff ladder.
 *
 * `label` is part of the delay queue name, so changing a delay creates a new
 * queue instead of colliding with the existing one. Re-asserting a queue with
 * different arguments fails with PRECONDITION_FAILED, which closes the channel
 * — and the channel is shared by every job.
 */
export interface RetryTier {
  label: string;
  delay: number;
}

/**
 * Delay applied before each retry. A job runs at most
 * `DEFAULT_RETRY_LADDER.length + 1` times before failing terminally, so the
 * worst case here is ~6m10s of waiting spread over 4 attempts.
 */
export const DEFAULT_RETRY_LADDER: RetryTier[] = [
  { label: "10s", delay: 10_000 },
  { label: "1m", delay: 60_000 },
  { label: "5m", delay: 300_000 },
];

/**
 * Tier to use for the next attempt, or `null` when the ladder is exhausted and
 * the job must fail terminally. `attempts` counts executions already made, so
 * it indexes the ladder directly.
 */
export function getRetryTier(
  ladder: RetryTier[],
  attempts: number,
): RetryTier | null {
  return ladder[attempts] ?? null;
}

/**
 * Name of the delay queue holding jobs waiting out `tier` before their next
 * attempt on `queue`.
 */
export function getRetryQueueName(queue: string, tier: RetryTier): string {
  return `${queue}.retry.${tier.label}`;
}

/**
 * Arguments for a delay queue.
 *
 * A delay queue has no consumer: a message published to it sits there until its
 * TTL expires, at which point RabbitMQ dead-letters it back to the job queue on
 * its own. Nothing in the app schedules or polls.
 *
 * The queue is a quorum queue purely so it can use the at-least-once
 * dead-letter strategy, which confirms the message reached the job queue before
 * dropping it here. With the default at-most-once strategy a broker failure
 * during that hop loses the message, which would leave the job's row stuck in
 * `progress` forever instead of being marked as failed.
 */
export function getRetryQueueOptions(
  queue: string,
  tier: RetryTier,
): Options.AssertQueue {
  return {
    durable: true,
    messageTtl: tier.delay,
    // Empty exchange means the default exchange, which routes by queue name.
    deadLetterExchange: "",
    deadLetterRoutingKey: queue,
    // Required by the at-least-once dead-letter strategy.
    overflow: "reject-publish",
    arguments: {
      "x-queue-type": "quorum",
      "x-dead-letter-strategy": "at-least-once",
    },
  };
}
