import {
  ProjectEventNameSchema,
  type ProjectEventName,
} from "@argos/schemas/project-event";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { AuthOAuthPayload, AuthPATPayload } from "@/auth/payload";
import {
  Project,
  ProjectEvent,
  type Account,
  type Webhook,
  type WebhookDelivery,
} from "@/database/models";
import { boom } from "@/util/error";
import {
  assertAccountAdmin,
  createWebhook,
  findAccountWebhook,
  findWebhookDelivery,
  getProjectsByWebhookId,
  listAccountWebhooks,
  listWebhookDeliveries,
  resendWebhookDelivery,
} from "@/webhook/manage";

import { getAccountForAuth } from "../auth/project";
import { EventSchema, serializeEvent } from "../schema/primitives/event";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const AccountPathSchema = z.object({
  accountSlug: AccountSlug.meta({ description: "Slug of the account." }),
});

const WebhookPathSchema = AccountPathSchema.extend({
  webhookId: z.string().meta({ description: "ID of the webhook." }),
});

const DeliveryPathSchema = WebhookPathSchema.extend({
  deliveryId: z.string().meta({ description: "ID of the delivery." }),
});

const WebhookSchema = z
  .object({
    id: z.string(),
    url: z.url().meta({ description: "The endpoint Argos posts events to." }),
    events: z.array(ProjectEventNameSchema).meta({
      description: "The events the webhook receives.",
    }),
    projects: z.array(ProjectName).nullable().meta({
      description:
        "Names of the projects the webhook receives the events of, or `null` for every project of the account, including the ones created later.",
    }),
    createdAt: z.iso.datetime(),
  })
  .meta({
    description:
      "An endpoint Argos posts the events of an account's projects to. Its signing secret is only returned at creation.",
    id: "Webhook",
  });

const CreatedWebhookSchema = WebhookSchema.extend({
  secret: z.string().meta({
    description:
      "The signing secret (`whsec_…`), to verify the `webhook-signature` header of each request. It is never returned again: save it now.",
  }),
}).meta({ id: "CreatedWebhook" });

const CreateWebhookBodySchema = z.object({
  url: z.string().meta({
    description: "The endpoint to post events to. It must use HTTPS.",
  }),
  events: z.array(ProjectEventNameSchema).min(1).meta({
    description: "The events to receive.",
  }),
  projects: z.array(ProjectName).min(1).nullable().default(null).meta({
    description:
      "Names of the projects to receive the events of. Defaults to `null`: every project of the account, including the ones created later.",
  }),
});

const WebhookDeliveryStatusSchema = z
  .enum(["pending", "success", "failed"])
  .meta({
    description:
      "`pending` until the endpoint accepts the event or the retries run out, then `success` or `failed`.",
    id: "WebhookDeliveryStatus",
  });

const WebhookDeliverySchema = z
  .object({
    id: z.string(),
    status: WebhookDeliveryStatusSchema,
    eventId: z.string().meta({
      description: "The `id` of the event delivered, its `webhook-id` header.",
    }),
    eventType: ProjectEventNameSchema,
    attempts: z.int().min(0),
    attemptedAt: z.iso.datetime().nullable().meta({
      description: "When the latest attempt was made.",
    }),
    responseStatus: z.int().nullable().meta({
      description:
        "HTTP status of the latest attempt, `null` when it got no response.",
    }),
    durationMs: z.int().nullable().meta({
      description: "How long the latest attempt waited for a response.",
    }),
    failureReason: z.string().nullable().meta({
      description: "Why the latest attempt failed, `null` when it succeeded.",
    }),
    createdAt: z.iso.datetime(),
  })
  .meta({
    description: "An event sent to a webhook, across all of its attempts.",
    id: "WebhookDelivery",
  });

const WebhookDeliveryDetailSchema = WebhookDeliverySchema.extend({
  responseBody: z.string().nullable().meta({
    description: "The start of the latest response body (4 KB at most).",
  }),
  event: EventSchema.meta({ description: "The event, as the request body." }),
}).meta({ id: "WebhookDeliveryDetail" });

const ListWebhookDeliveriesQuerySchema = PageParamsSchema.extend({
  status: WebhookDeliveryStatusSchema.optional().meta({
    description: "Only the deliveries with this status.",
  }),
  eventId: z.string().optional().meta({
    description: "Only the deliveries of this event.",
  }),
});

const responses = {
  "400": invalidParameters,
  "401": unauthorized,
  "403": forbidden,
  "404": notFound,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

const security = patOrOAuthAuth(["account:admin"]);

type ApiAuth = AuthPATPayload | AuthOAuthPayload;

function serializeWebhook(
  webhook: Webhook,
  projects: readonly Project[] | null,
): z.infer<typeof WebhookSchema> {
  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    projects: projects?.map((project) => project.name) ?? null,
    createdAt: new Date(webhook.createdAt).toISOString(),
  };
}

async function serializeWebhooks(webhooks: Webhook[]) {
  const projectsByWebhookId = await getProjectsByWebhookId(
    webhooks.filter((webhook) => !webhook.allProjects).map(({ id }) => id),
  );
  return webhooks.map((webhook) =>
    serializeWebhook(
      webhook,
      webhook.allProjects ? null : (projectsByWebhookId.get(webhook.id) ?? []),
    ),
  );
}

function serializeDelivery(
  delivery: WebhookDelivery,
  eventType: ProjectEventName,
): z.infer<typeof WebhookDeliverySchema> {
  return {
    id: delivery.id,
    status: delivery.conclusion ?? "pending",
    eventId: delivery.eventId,
    eventType,
    attempts: delivery.attempts,
    attemptedAt: delivery.attemptedAt
      ? new Date(delivery.attemptedAt).toISOString()
      : null,
    responseStatus: delivery.responseStatus,
    durationMs: delivery.durationMs,
    failureReason: delivery.failureReason,
    createdAt: new Date(delivery.createdAt).toISOString(),
  };
}

/**
 * Deliveries whose event is gone are left out: the retention purge deletes an
 * event with its deliveries, so one read just before it can outlive its event.
 */
async function serializeDeliveries(deliveries: WebhookDelivery[]) {
  // A list only names its events: their payloads stay for the detail.
  const events = await ProjectEvent.query()
    .select("id", "name")
    .findByIds([...new Set(deliveries.map(({ eventId }) => eventId))]);
  const names = new Map(events.map((event) => [event.id, event.name]));
  return deliveries.flatMap((delivery) => {
    const name = names.get(delivery.eventId);
    return name ? [serializeDelivery(delivery, name)] : [];
  });
}

async function serializeDeliveryDetail(
  delivery: WebhookDelivery,
): Promise<z.infer<typeof WebhookDeliveryDetailSchema>> {
  const event = await ProjectEvent.query().findById(delivery.eventId);
  if (!event) {
    throw boom(404, "Delivery not found.");
  }
  return {
    ...serializeDelivery(delivery, event.name),
    responseBody: delivery.responseBody,
    event: serializeEvent(event),
  };
}

/**
 * The account's live projects with these names. A missing name is reported
 * rather than skipped, so a typo cannot silently narrow a webhook.
 */
async function loadProjectsByName(account: Account, names: string[]) {
  const unique = [...new Set(names)];
  const projects = await Project.queryNotDeleted()
    .where("accountId", account.id)
    .whereIn("name", unique);
  const missing = unique.filter(
    (name) => !projects.some((project) => project.name === name),
  );
  if (missing.length > 0) {
    throw boom(404, `Project not found: ${missing.join(", ")}.`);
  }
  return projects;
}

async function loadWebhookForRequest(
  auth: ApiAuth,
  params: { accountSlug: string; webhookId: string },
): Promise<Webhook> {
  const account = getAccountForAuth(auth, { slug: params.accountSlug });
  const [, webhook] = await Promise.all([
    assertAccountAdmin(account, auth),
    findAccountWebhook(account, params.webhookId),
  ]);
  if (!webhook) {
    throw boom(404, "Webhook not found.");
  }
  return webhook;
}

async function loadDeliveryForRequest(
  auth: ApiAuth,
  params: { accountSlug: string; webhookId: string; deliveryId: string },
): Promise<WebhookDelivery> {
  const webhook = await loadWebhookForRequest(auth, params);
  const delivery = await findWebhookDelivery(webhook, params.deliveryId);
  if (!delivery) {
    throw boom(404, "Delivery not found.");
  }
  return delivery;
}

export const listAccountWebhooksOperation = {
  operationId: "listAccountWebhooks",
  summary: "List an account's webhooks",
  description:
    "List the webhooks of an account, newest first. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: { path: AccountPathSchema },
  responses: {
    "200": {
      description: "The account's webhooks",
      content: { "application/json": { schema: z.array(WebhookSchema) } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const listAccountWebhooksHandler: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/webhooks", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });
    await assertAccountAdmin(account, auth);
    res.send(await serializeWebhooks(await listAccountWebhooks(account)));
  });
};

export const createAccountWebhookOperation = {
  operationId: "createAccountWebhook",
  summary: "Create a webhook",
  description:
    "Create a webhook: Argos posts the selected events of the account's projects to its URL, signed with the secret returned once in the response. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: { path: AccountPathSchema },
  requestBody: {
    required: true,
    content: { "application/json": { schema: CreateWebhookBodySchema } },
  },
  responses: {
    "201": {
      description: "The created webhook, with its secret",
      content: { "application/json": { schema: CreatedWebhookSchema } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const createAccountWebhookHandler: CreateAPIHandler = ({ post }) => {
  post("/accounts/{accountSlug}/webhooks", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });
    await assertAccountAdmin(account, auth);
    const { url, events } = req.ctx.body;
    const projects = req.ctx.body.projects
      ? await loadProjectsByName(account, req.ctx.body.projects)
      : null;
    const { webhook, secret } = await createWebhook({
      account,
      url,
      events,
      projects,
    });
    res.status(201).send({ ...serializeWebhook(webhook, projects), secret });
  });
};

export const getAccountWebhookOperation = {
  operationId: "getAccountWebhook",
  summary: "Get a webhook",
  description:
    "Get a webhook of an account. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: { path: WebhookPathSchema },
  responses: {
    "200": {
      description: "The webhook",
      content: { "application/json": { schema: WebhookSchema } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const getAccountWebhookHandler: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/webhooks/{webhookId}", async (req, res) => {
    const webhook = await loadWebhookForRequest(
      await req.ctx.auth(),
      req.ctx.params,
    );
    const [serialized] = await serializeWebhooks([webhook]);
    res.send(serialized);
  });
};

export const deleteAccountWebhookOperation = {
  operationId: "deleteAccountWebhook",
  summary: "Delete a webhook",
  description:
    "Delete a webhook: Argos stops sending it events, including the deliveries waiting for a retry. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: { path: WebhookPathSchema },
  responses: {
    "204": { description: "Webhook deleted" },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const deleteAccountWebhookHandler: CreateAPIHandler = ({
  delete: del,
}) => {
  del("/accounts/{accountSlug}/webhooks/{webhookId}", async (req, res) => {
    const webhook = await loadWebhookForRequest(
      await req.ctx.auth(),
      req.ctx.params,
    );
    await webhook.$query().delete();
    res.status(204).send();
  });
};

export const listWebhookDeliveriesOperation = {
  operationId: "listWebhookDeliveries",
  summary: "List a webhook's deliveries",
  description:
    "List the deliveries of a webhook, most recent first, to find the ones that failed. Deliveries are kept 7 days. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: {
    path: WebhookPathSchema,
    query: ListWebhookDeliveriesQuerySchema,
  },
  responses: {
    "200": {
      description: "The webhook's deliveries",
      content: {
        "application/json": { schema: paginated(WebhookDeliverySchema) },
      },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const listWebhookDeliveriesHandler: CreateAPIHandler = ({ get }) => {
  get(
    "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries",
    async (req, res) => {
      const webhook = await loadWebhookForRequest(
        await req.ctx.auth(),
        req.ctx.params,
      );
      const { page, perPage, status, eventId } = req.ctx.query;
      const deliveries = await listWebhookDeliveries({
        webhookId: webhook.id,
        status: status ?? null,
        eventId: eventId ?? null,
        after: (page - 1) * perPage,
        first: perPage,
      });
      res.send({
        results: await serializeDeliveries(deliveries.results),
        pageInfo: { total: deliveries.total, page, perPage },
      });
    },
  );
};

export const getWebhookDeliveryOperation = {
  operationId: "getWebhookDelivery",
  summary: "Get a webhook delivery",
  description:
    "Get a delivery of a webhook with the request it sent and the start of the response it got. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: { path: DeliveryPathSchema },
  responses: {
    "200": {
      description: "The delivery",
      content: { "application/json": { schema: WebhookDeliveryDetailSchema } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const getWebhookDeliveryHandler: CreateAPIHandler = ({ get }) => {
  get(
    "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries/{deliveryId}",
    async (req, res) => {
      const delivery = await loadDeliveryForRequest(
        await req.ctx.auth(),
        req.ctx.params,
      );
      res.send(await serializeDeliveryDetail(delivery));
    },
  );
};

export const resendWebhookDeliveryOperation = {
  operationId: "resendWebhookDelivery",
  summary: "Resend a webhook delivery",
  description:
    "Send a delivery's event to its webhook again, as a new delivery. It keeps the event's `webhook-id`, so an endpoint that already processed the event can skip it. While the event is still being sent to the webhook, returns that delivery instead of sending it twice. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  "x-mcp": { destructive: true },
  requestParams: { path: DeliveryPathSchema },
  responses: {
    "200": {
      description: "The delivery still sending the event",
      content: { "application/json": { schema: WebhookDeliverySchema } },
    },
    "201": {
      description: "The new delivery",
      content: { "application/json": { schema: WebhookDeliverySchema } },
    },
    ...responses,
  },
} satisfies ZodOpenApiOperationObject;

export const resendWebhookDeliveryHandler: CreateAPIHandler = ({ post }) => {
  post(
    "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries/{deliveryId}/resend",
    async (req, res) => {
      const delivery = await loadDeliveryForRequest(
        await req.ctx.auth(),
        req.ctx.params,
      );
      const resent = await resendWebhookDelivery(delivery);
      const [serialized] = await serializeDeliveries([resent.delivery]);
      if (!serialized) {
        throw boom(404, "Delivery not found.");
      }
      res.status(resent.created ? 201 : 200).send(serialized);
    },
  );
};
