import { ProjectEventNameSchema } from "@argos/schemas/project-event";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { AuthViewer } from "@/auth/payload";
import {
  Project,
  ProjectEvent,
  type Account,
  type Webhook,
  type WebhookDelivery,
} from "@/database/models";
import { boom } from "@/util/error";
import {
  createWebhook,
  deleteWebhook,
  getProjectsByWebhookId,
  listAccountWebhooks,
  listWebhookDeliveries,
  loadAccountWebhook,
  loadWebhookDelivery,
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

async function serializeWebhooks(
  webhooks: Webhook[],
): Promise<z.infer<typeof WebhookSchema>[]> {
  const projectsByWebhookId = await getProjectsByWebhookId(
    webhooks.filter((webhook) => !webhook.allProjects).map(({ id }) => id),
  );
  return webhooks.map((webhook) => ({
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    projects: webhook.allProjects
      ? null
      : (projectsByWebhookId.get(webhook.id) ?? []).map(
          (project) => project.name,
        ),
    createdAt: new Date(webhook.createdAt).toISOString(),
  }));
}

async function serializeWebhook(webhook: Webhook) {
  const [serialized] = await serializeWebhooks([webhook]);
  invariant(serialized, "Webhook not serialized");
  return serialized;
}

function serializeDelivery(
  delivery: WebhookDelivery,
  event: ProjectEvent,
): z.infer<typeof WebhookDeliverySchema> {
  return {
    id: delivery.id,
    status: delivery.conclusion ?? "pending",
    eventId: event.id,
    eventType: event.name,
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

async function serializeDeliveries(deliveries: WebhookDelivery[]) {
  const events = await ProjectEvent.query().findByIds([
    ...new Set(deliveries.map((delivery) => delivery.eventId)),
  ]);
  return deliveries.map((delivery) => {
    const event = events.find(({ id }) => id === delivery.eventId);
    invariant(event, `Event not found: ${delivery.eventId}`);
    return serializeDelivery(delivery, event);
  });
}

async function serializeDeliveryDetail(
  delivery: WebhookDelivery,
): Promise<z.infer<typeof WebhookDeliveryDetailSchema>> {
  const event = await ProjectEvent.query().findById(delivery.eventId);
  invariant(event, `Event not found: ${delivery.eventId}`);
  return {
    ...serializeDelivery(delivery, event),
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
  auth: Parameters<typeof getAccountForAuth>[0] & AuthViewer,
  params: { accountSlug: string; webhookId: string },
) {
  const account = getAccountForAuth(auth, { slug: params.accountSlug });
  return loadAccountWebhook({ account, auth, id: params.webhookId });
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
    const webhooks = await listAccountWebhooks({ account, auth });
    if (!webhooks) {
      throw boom(
        403,
        "Only administrators of the account can manage webhooks.",
      );
    }
    res.send(await serializeWebhooks(webhooks));
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
    const { url, events, projects } = req.ctx.body;
    const projectIds = projects
      ? (await loadProjectsByName(account, projects)).map(({ id }) => id)
      : null;
    const { webhook, secret } = await createWebhook({
      account,
      auth,
      url,
      events,
      projectIds,
    });
    res.status(201).send({ ...(await serializeWebhook(webhook)), secret });
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
    res.send(await serializeWebhook(webhook));
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
    const auth = await req.ctx.auth();
    const webhook = await loadWebhookForRequest(auth, req.ctx.params);
    await deleteWebhook({ webhook, auth });
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
      const webhook = await loadWebhookForRequest(
        await req.ctx.auth(),
        req.ctx.params,
      );
      const delivery = await loadWebhookDelivery({
        webhook,
        id: req.ctx.params.deliveryId,
      });
      res.send(await serializeDeliveryDetail(delivery));
    },
  );
};

export const resendWebhookDeliveryOperation = {
  operationId: "resendWebhookDelivery",
  summary: "Resend a webhook delivery",
  description:
    "Send a delivery's event to its webhook again, as a new delivery. It keeps the event's `webhook-id`, so an endpoint that already processed the event can skip it. Requires administrator access to the account.",
  tags: ["Webhooks"],
  security,
  requestParams: { path: DeliveryPathSchema },
  responses: {
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
      const auth = await req.ctx.auth();
      const webhook = await loadWebhookForRequest(auth, req.ctx.params);
      const delivery = await loadWebhookDelivery({
        webhook,
        id: req.ctx.params.deliveryId,
      });
      const resent = await resendWebhookDelivery({ delivery, auth });
      const [serialized] = await serializeDeliveries([resent]);
      res.status(201).send(serialized);
    },
  );
};
