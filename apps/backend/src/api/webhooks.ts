import { PROJECT_EVENTS } from "@argos/schemas/project-event";
import { z } from "zod";
import type { ZodOpenApiPathsObject } from "zod-openapi";

import { EVENT_SCHEMAS, EVENT_TYPES } from "./schema/primitives/event";

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
        description: `${EVENT_TYPES[name].description} Argos sends it to the webhooks subscribed to \`${name}\`. The body is also an item of the events feed.`,
        tags: ["Events"],
        security: [],
        requestParams: { header: WebhookHeadersSchema },
        requestBody: {
          required: true,
          content: { "application/json": { schema: EVENT_SCHEMAS[name] } },
        },
        responses: {
          "200": {
            description:
              "Answer with any 2xx status within 10 seconds. Argos retries any other answer, a redirect or a timeout up to 3 more times over about 6 minutes.",
          },
        },
      },
    },
  ]),
);
