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
import { redisLock } from "@/util/redis";

import { webhookDeliveryJob } from "./job";
import { generateWebhookSecret } from "./request";
import { parseWebhookUrl } from "./url";

/**
 * Each webhook multiplies the requests one event sends, so an account cannot
 * pile them up.
 */
const MAX_WEBHOOKS_PER_ACCOUNT = 20;

/** What delivery lists read: every column but the response body. */
export const WEBHOOK_DELIVERY_LIST_COLUMNS = [
  "id",
  "createdAt",
  "updatedAt",
  "webhookId",
  "eventId",
  "jobStatus",
  "attempts",
  "conclusion",
  "attemptedAt",
  "responseStatus",
  "durationMs",
  "failureReason",
] as const;

/**
 * Whether the viewer may manage the account's webhooks: a webhook receives
 * every event of the projects it covers, so only administrators can.
 *
 * The functions below do not check it: each API layer applies it with its
 * own policy (a 403, or a `null` field).
 */
export async function checkIsAccountAdmin(
  account: Account,
  auth: AuthViewer,
): Promise<boolean> {
  const permissions = await account.$getPermissions(auth);
  return permissions.includes("admin");
}

export async function assertAccountAdmin(
  account: Account,
  auth: AuthViewer,
): Promise<void> {
  if (!(await checkIsAccountAdmin(account, auth))) {
    throw boom(403, "Only administrators of the account can manage webhooks.");
  }
}

export async function listAccountWebhooks(
  account: Account,
): Promise<Webhook[]> {
  return Webhook.query()
    .where("accountId", account.id)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc");
}

export async function findAccountWebhook(
  account: Account,
  id: string,
): Promise<Webhook | null> {
  if (!isValidPgBigInt(id)) {
    return null;
  }
  const webhook = await Webhook.query().findOne({ id, accountId: account.id });
  return webhook ?? null;
}

export async function findWebhookDelivery(
  webhook: Webhook,
  id: string,
): Promise<WebhookDelivery | null> {
  if (!isValidPgBigInt(id)) {
    return null;
  }
  const delivery = await WebhookDelivery.query().findOne({
    id,
    webhookId: webhook.id,
  });
  return delivery ?? null;
}

/**
 * The account's live projects with these ids, or a 404 for any other id.
 */
export async function loadAccountProjects(
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
  url: string;
  events: readonly ProjectEventName[];
  /** The account's projects to receive events from, `null` for all of them. */
  projects: readonly Project[] | null;
}): Promise<{ webhook: Webhook; secret: string }> {
  const { account, projects } = args;

  const url = parseWebhookUrl(args.url, {
    allowPrivateNetwork: config.get("webhooks.allowPrivateNetwork"),
  });

  const events = [...new Set(args.events)];
  if (events.length === 0) {
    throw boom(400, "Select at least one event.", { field: "events" });
  }

  const secret = generateWebhookSecret();

  // Counted and inserted under one lock: concurrent creations would all pass
  // the count otherwise.
  const webhook = await redisLock.acquire(
    ["create-webhook", account.id],
    async () => {
      const count = await Webhook.query()
        .where("accountId", account.id)
        .resultSize();
      if (count >= MAX_WEBHOOKS_PER_ACCOUNT) {
        throw boom(
          400,
          `An account can have up to ${MAX_WEBHOOKS_PER_ACCOUNT} webhooks. Delete one to add another.`,
        );
      }
      return transaction(async (trx) => {
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
    },
  );

  return { webhook, secret };
}

type WebhookDeliveryStatus = "pending" | "success" | "failed";

/**
 * A webhook's deliveries, most recent first, without their response bodies.
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
    .select(WEBHOOK_DELIVERY_LIST_COLUMNS)
    .where("webhookId", webhookId)
    .orderBy("id", "desc");
  if (status === "pending") {
    query.whereNull("conclusion");
  } else if (status) {
    query.where("conclusion", status);
  }
  if (eventId !== null) {
    query.where("eventId", eventId);
  }
  const results = await query.clone().offset(after).limit(first);
  // A page that comes up short tells the total without counting.
  const total =
    results.length < first && (results.length > 0 || after === 0)
      ? after + results.length
      : await query.clone().resultSize();
  return { results, total };
}

/**
 * Send a delivery's event to its webhook again, as a new delivery. It keeps
 * the event's id, so an endpoint that already processed it can tell.
 */
export async function resendWebhookDelivery(
  delivery: WebhookDelivery,
): Promise<WebhookDelivery> {
  const resent = await WebhookDelivery.query()
    .insert({
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
      jobStatus: "pending",
    })
    .returning("*");
  await webhookDeliveryJob.push(resent.id);
  return resent;
}

/**
 * The live projects each webhook is linked to, by webhook id. A link to a
 * project of another account reaches nothing.
 */
export async function getProjectsByWebhookId(
  webhookIds: readonly string[],
): Promise<Map<string, Project[]>> {
  const projectsByWebhookId = new Map<string, Project[]>();
  if (webhookIds.length === 0) {
    return projectsByWebhookId;
  }
  const links = await WebhookProject.query()
    .withGraphJoined("project")
    .join("webhooks", "webhooks.id", "webhook_projects.webhookId")
    .whereIn("webhook_projects.webhookId", [...webhookIds])
    .whereNull("project.deletedAt")
    .whereColumn("project.accountId", "webhooks.accountId")
    .orderBy("project.name");
  for (const link of links) {
    invariant(link.project, "Webhook link without project");
    const projects = projectsByWebhookId.get(link.webhookId) ?? [];
    projects.push(link.project);
    projectsByWebhookId.set(link.webhookId, projects);
  }
  return projectsByWebhookId;
}
