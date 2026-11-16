import type { ProjectEventName } from "@argos/schemas/project-event";

import type { AuthViewer } from "@/auth/payload";
import config from "@/config";
import { transaction } from "@/database";
import {
  Project,
  Webhook,
  WebhookProject,
  type Account,
} from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { boom } from "@/util/error";

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
    if (projects && projects.length > 0) {
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
  if (!account) {
    throw boom(404, "Webhook not found.");
  }
  await assertAccountAdmin(account, auth);
  await webhook.$query().delete();
}
