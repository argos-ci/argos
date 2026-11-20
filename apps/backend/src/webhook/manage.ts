import type { ProjectEventName } from "@argos/schemas/project-event";
import { invariant } from "@argos/util/invariant";

import type { AuthViewer } from "@/auth/payload";
import config from "@/config";
import { transaction } from "@/database";
import {
  Project,
  Webhook,
  WebhookDelivery,
  WebhookProject,
  type Account,
} from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { boom } from "@/util/error";

import { webhookDeliveryJob } from "./job";
import { generateWebhookSecret } from "./request";
import { parseWebhookUrl } from "./url";

/**
 * Each webhook multiplies the requests one event sends, so an account cannot
 * pile them up.
 */
const MAX_WEBHOOKS_PER_ACCOUNT = 20;

async function assertAccountAdmin(account: Account, auth: AuthViewer) {
  const permissions = await account.$getPermissions(auth);
  if (!permissions.includes("admin")) {
    throw boom(403, "Only administrators of the account can manage webhooks.");
  }
}

/**
 * The account's webhooks, or `null` when the viewer is not an administrator:
 * a webhook receives every event of the projects it covers.
 */
export async function listAccountWebhooks(args: {
  account: Account;
  auth: AuthViewer;
}): Promise<Webhook[] | null> {
  const { account, auth } = args;
  const permissions = await account.$getPermissions(auth);
  if (!permissions.includes("admin")) {
    return null;
  }
  return Webhook.query()
    .where("accountId", account.id)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc");
}

async function loadAccountProjects(
  account: Account,
  projectIds: readonly string[],
): Promise<Project[]> {
  const ids = [...new Set(projectIds)];
  if (ids.length === 0) {
    throw boom(400, "Select at least one project.", { field: "projectIds" });
  }
  if (!ids.every(isValidPgBigInt)) {
    throw boom(404, "Project not found.");
  }
  const projects = await Project.queryNotDeleted()
    .where("accountId", account.id)
    .findByIds(ids);
  if (projects.length !== ids.length) {
    throw boom(404, "Project not found.");
  }
  return projects;
}

/**
 * Create a webhook. The secret is returned here only: show it once.
 */
export async function createWebhook(args: {
  account: Account;
  auth: AuthViewer;
  url: string;
  events: readonly ProjectEventName[];
  /** The projects to receive events from, `null` for all of them. */
  projectIds: readonly string[] | null;
}): Promise<{ webhook: Webhook; secret: string }> {
  const { account, auth, projectIds } = args;
  await assertAccountAdmin(account, auth);

  const url = parseWebhookUrl(args.url, {
    allowPrivateNetwork: config.get("webhooks.allowPrivateNetwork"),
  });

  const events = [...new Set(args.events)];
  if (events.length === 0) {
    throw boom(400, "Select at least one event.", { field: "events" });
  }

  const projects = projectIds
    ? await loadAccountProjects(account, projectIds)
    : null;

  const count = await Webhook.query()
    .where("accountId", account.id)
    .resultSize();
  if (count >= MAX_WEBHOOKS_PER_ACCOUNT) {
    throw boom(
      400,
      `An account can have up to ${MAX_WEBHOOKS_PER_ACCOUNT} webhooks. Delete one to add another.`,
    );
  }

  const secret = generateWebhookSecret();

  const webhook = await transaction(async (trx) => {
    const webhook = await Webhook.query(trx).insertAndFetch({
      accountId: account.id,
      url,
      secret,
      events,
      allProjects: projects === null,
    });
    if (projects) {
      await WebhookProject.query(trx).insert(
        projects.map((project) => ({
          webhookId: webhook.id,
          projectId: project.id,
        })),
      );
    }
    return webhook;
  });

  return { webhook, secret };
}

export async function deleteWebhook(args: {
  webhook: Webhook;
  auth: AuthViewer;
}): Promise<void> {
  const { webhook, auth } = args;
  const account = await webhook.$relatedQuery("account");
  invariant(account, "webhook account not found");
  await assertAccountAdmin(account, auth);
  await webhook.$query().delete();
}

/**
 * A webhook of the account, or `null` when there is none with this id or the
 * viewer is not an administrator.
 */
export async function getAccountWebhook(args: {
  account: Account;
  auth: AuthViewer;
  id: string;
}): Promise<Webhook | null> {
  const { account, auth, id } = args;
  const permissions = await account.$getPermissions(auth);
  if (!permissions.includes("admin") || !isValidPgBigInt(id)) {
    return null;
  }
  const webhook = await Webhook.query().findOne({ id, accountId: account.id });
  return webhook ?? null;
}

export type WebhookDeliveryStatus = "pending" | "success" | "failed";

/**
 * A webhook's deliveries, most recent first.
 */
export async function listWebhookDeliveries(args: {
  webhookId: string;
  status: WebhookDeliveryStatus | null;
  eventId: string | null;
  after: number;
  first: number;
}): Promise<{ results: WebhookDelivery[]; total: number }> {
  const { webhookId, status, eventId, after, first } = args;
  if (eventId !== null && !isValidPgBigInt(eventId)) {
    return { results: [], total: 0 };
  }
  const query = WebhookDelivery.query()
    .where("webhookId", webhookId)
    .orderBy("id", "desc")
    .range(after, after + first - 1);
  if (status === "pending") {
    query.whereNull("conclusion");
  } else if (status) {
    query.where("conclusion", status);
  }
  if (eventId !== null) {
    query.where("eventId", eventId);
  }
  return query;
}

/**
 * Send a delivery's event to its webhook again, as a new delivery. It keeps
 * the event's id, so an endpoint that already processed it can tell.
 */
export async function resendWebhookDelivery(args: {
  delivery: WebhookDelivery;
  auth: AuthViewer;
}): Promise<WebhookDelivery> {
  const { delivery, auth } = args;
  const webhook = await Webhook.query()
    .findById(delivery.webhookId)
    .withGraphFetched("account");
  invariant(webhook?.account, "delivery webhook account not found");
  await assertAccountAdmin(webhook.account, auth);
  const resent = await WebhookDelivery.query().insertAndFetch({
    webhookId: webhook.id,
    eventId: delivery.eventId,
    jobStatus: "pending",
  });
  await webhookDeliveryJob.push(resent.id);
  return resent;
}

/**
 * A webhook of the account, for an administrator. Throws a 403 for anyone
 * else and a 404 when the account has no such webhook.
 */
export async function loadAccountWebhook(args: {
  account: Account;
  auth: AuthViewer;
  id: string;
}): Promise<Webhook> {
  const { account, auth, id } = args;
  await assertAccountAdmin(account, auth);
  const webhook = isValidPgBigInt(id)
    ? await Webhook.query().findOne({ id, accountId: account.id })
    : undefined;
  if (!webhook) {
    throw boom(404, "Webhook not found.");
  }
  return webhook;
}

/**
 * One of a webhook's deliveries. Throws a 404 when it has none with this id.
 */
export async function loadWebhookDelivery(args: {
  webhook: Webhook;
  id: string;
}): Promise<WebhookDelivery> {
  const { webhook, id } = args;
  const delivery = isValidPgBigInt(id)
    ? await WebhookDelivery.query().findOne({ id, webhookId: webhook.id })
    : undefined;
  if (!delivery) {
    throw boom(404, "Delivery not found.");
  }
  return delivery;
}

/**
 * The live projects each webhook is linked to, by webhook id. A link to a
 * project of another account reaches nothing.
 */
export async function getProjectsByWebhookId(
  webhookIds: readonly string[],
): Promise<Map<string, Project[]>> {
  const links = await WebhookProject.query()
    .withGraphJoined("project")
    .join("webhooks", "webhooks.id", "webhook_projects.webhookId")
    .whereIn("webhook_projects.webhookId", [...webhookIds])
    .whereNull("project.deletedAt")
    .whereColumn("project.accountId", "webhooks.accountId")
    .orderBy("project.name");
  const projectsByWebhookId = new Map<string, Project[]>();
  for (const link of links) {
    invariant(link.project, "Webhook link without project");
    const projects = projectsByWebhookId.get(link.webhookId) ?? [];
    projects.push(link.project);
    projectsByWebhookId.set(link.webhookId, projects);
  }
  return projectsByWebhookId;
}
