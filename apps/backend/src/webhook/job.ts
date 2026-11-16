import { invariant } from "@argos/util/invariant";

import { serializeEvent } from "@/api/schema/primitives/event";
import config from "@/config";
import { ProjectEvent, Webhook, WebhookDelivery } from "@/database/models";
import { createJob } from "@/job-core";
import { DEFAULT_RETRY_LADDER } from "@/job-core/backoff";

import { postWebhookRequest } from "./request";

/**
 * The job queue makes the retries: a failed attempt throws, and the queue
 * runs it again after the ladder's next delay. The ladder runs out after this
 * many attempts, so the last one records the failure instead of throwing.
 */
const MAX_ATTEMPTS = DEFAULT_RETRY_LADDER.length + 1;

class WebhookAttemptError extends Error {}

export async function deliverWebhook(delivery: WebhookDelivery): Promise<void> {
  const [webhook, event] = await Promise.all([
    Webhook.query().findById(delivery.webhookId),
    ProjectEvent.query().findById(delivery.eventId),
  ]);
  invariant(webhook, `Webhook not found: ${delivery.webhookId}`);
  invariant(event, `Event not found: ${delivery.eventId}`);

  const attempts = delivery.attempts + 1;
  const result = await postWebhookRequest({
    url: webhook.url,
    secret: webhook.secret,
    messageId: event.id,
    body: JSON.stringify(serializeEvent(event)),
    allowPrivateNetwork: config.get("webhooks.allowPrivateNetwork"),
  });

  if (result.ok) {
    await delivery.$query().patch({
      attempts,
      conclusion: "success",
      responseStatus: result.status,
      failureReason: null,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  const isFinal = !result.retryable || attempts >= MAX_ATTEMPTS;
  await delivery.$query().patch({
    attempts,
    responseStatus: result.status,
    failureReason: result.reason,
    ...(isFinal
      ? { conclusion: "failed", completedAt: new Date().toISOString() }
      : {}),
  });

  if (!isFinal) {
    throw new WebhookAttemptError(result.reason);
  }
}

export const webhookDeliveryJob = createJob<string>(
  "webhookDelivery",
  {
    perform: async (id, { logger }) => {
      const delivery = await WebhookDelivery.query().findById(id);
      // Deleting a webhook deletes its deliveries, queued ones included, and
      // a failing webhook is the one most likely to be deleted mid-retry.
      if (!delivery) {
        logger.info("Delivery deleted with its webhook");
        return;
      }
      if (delivery.jobStatus === "complete") {
        return;
      }
      await delivery.$query().patch({ jobStatus: "progress" });
      await deliverWebhook(delivery);
    },
    complete: async (id) => {
      await WebhookDelivery.query()
        .findById(id)
        .patch({ jobStatus: "complete" });
    },
    error: async (id) => {
      await WebhookDelivery.query().findById(id).patch({ jobStatus: "error" });
    },
  },
  // An endpoint can take the whole timeout to answer; one at a time, a few
  // slow endpoints would hold up every other delivery.
  { prefetch: 10 },
);
