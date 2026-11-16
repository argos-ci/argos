import {
  PROJECT_EVENT_DESCRIPTIONS,
  PROJECT_EVENTS,
} from "@argos/schemas/project-event";
import { z } from "zod";
import type { ZodOpenApiPathsObject } from "zod-openapi";

import { DEFAULT_RETRY_LADDER } from "@/job-core/backoff";
import { WEBHOOK_TIMEOUT_MS } from "@/webhook/request";

import { EVENT_SCHEMAS } from "./schema/primitives/event";

const RETRY_MINUTES = Math.round(
  DEFAULT_RETRY_LADDER.reduce((total, tier) => total + tier.delay, 0) / 60_000,
);

const WebhookHeadersSchema = z.object({
  "webhook-id": z.string().meta({
    description:
      "The event's `id`, the same on every attempt. Use it to ignore an event you already processed.",
  }),
  "webhook-timestamp": z.string().meta({
    description:
      "When the request was sent, in seconds since the Unix epoch. Refuse a request more than 5 minutes away from your clock.",
  }),
  "webhook-signature": z.string().meta({
    description:
      "`v1,` followed by the base64 HMAC-SHA256 of `{webhook-id}.{webhook-timestamp}.{body}`, keyed with the base64-decoded part of your webhook secret after `whsec_`. Any [Standard Webhooks](https://www.standardwebhooks.com) library verifies it.",
  }),
});

/**
 * The requests Argos sends to the webhooks a team configures, one per event
 * type, for the `webhooks` section of the OpenAPI document.
 */
export const webhooks: ZodOpenApiPathsObject = Object.fromEntries(
  PROJECT_EVENTS.map((name) => [
    name,
    {
      post: {
        summary: name,
        description: `${PROJECT_EVENT_DESCRIPTIONS[name]} Argos sends it to the webhooks subscribed to \`${name}\`. The body is also an item of the events feed.`,
        tags: ["Events"],
        security: [],
        requestParams: { header: WebhookHeadersSchema },
        requestBody: {
          required: true,
          content: { "application/json": { schema: EVENT_SCHEMAS[name] } },
        },
        responses: {
          "200": {
            description: `Answer with any 2xx status within ${WEBHOOK_TIMEOUT_MS / 1000} seconds. Argos retries any other status or a timeout up to ${DEFAULT_RETRY_LADDER.length} more times over about ${RETRY_MINUTES} minutes. A redirect is not followed and not retried.`,
          },
        },
      },
    },
  ]),
);
