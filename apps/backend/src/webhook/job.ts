import { invariant } from "@argos/util/invariant";

import config from "@/config";
import { ProjectEvent, Webhook, WebhookDelivery } from "@/database/models";
import { createModelJob, type JobContext } from "@/job-core";

import { getWebhookRequestBody, postWebhookRequest } from "./request";

class WebhookAttemptError extends Error {}

/**
 * Send a delivery's event to its webhook. A failed attempt throws while the
 * queue has retries left, so it runs again after the ladder's next delay; the
 * last one records the failure instead.
 */
export async function deliverWebhook(
  delivery: WebhookDelivery,
  ctx: Pick<JobContext, "attempts" | "isLastAttempt">,
): Promise<void> {
  const [webhook, event] = await Promise.all([
    Webhook.query().findById(delivery.webhookId),
    ProjectEvent.query().findById(delivery.eventId),
  ]);
  invariant(webhook, `Webhook not found: ${delivery.webhookId}`);
  invariant(event, `Event not found: ${delivery.eventId}`);

  const result = await postWebhookRequest({
    url: webhook.url,
    secret: webhook.secret,
    messageId: event.id,
    body: getWebhookRequestBody(event),
    allowPrivateNetwork: config.get("webhooks.allowPrivateNetwork"),
  });
  const attempt = {
    attempts: ctx.attempts + 1,
    attemptedAt: new Date().toISOString(),
    responseStatus: result.response?.status ?? null,
    durationMs: result.response?.durationMs ?? null,
    responseBody: result.response?.body ?? null,
  };

  if (result.ok) {
    await delivery
      .$query()
      .patch({ ...attempt, conclusion: "success", failureReason: null });
    return;
  }

  const isFinal = !result.retryable || ctx.isLastAttempt;
  await delivery.$query().patch({
    ...attempt,
    failureReason: result.reason,
    ...(isFinal ? { conclusion: "failed" } : {}),
  });

  if (!isFinal) {
    throw new WebhookAttemptError(result.reason);
  }
}

export const webhookDeliveryJob = createModelJob(
  "webhookDelivery",
  WebhookDelivery,
  deliverWebhook,
  {
    // An endpoint can take the whole timeout to answer; one at a time, a few
    // slow endpoints would hold up every other delivery.
    prefetch: 10,
    // Deleting a webhook deletes its deliveries, queued ones included, and a
    // failing webhook is the one most likely to be deleted mid-retry.
    ignoreMissing: true,
  },
);

/**
 * Far longer than a delivery waits in the queue, so a job still on its way is
 * not queued twice.
 */
const STALLED_DELIVERY_DELAY_MS = 10 * 60 * 1000;

/**
 * Queue again the deliveries no job ever picked up: the push that follows
 * their commit can fail, and nothing else would send them.
 */
export async function requeueStalledWebhookDeliveries(
  now: Date,
): Promise<void> {
  const stalled = await WebhookDelivery.query()
    .select("id")
    .where("jobStatus", "pending")
    .where(
      "createdAt",
      "<",
      new Date(now.getTime() - STALLED_DELIVERY_DELAY_MS).toISOString(),
    );
  if (stalled.length > 0) {
    await webhookDeliveryJob.push(...stalled.map((delivery) => delivery.id));
  }
}
