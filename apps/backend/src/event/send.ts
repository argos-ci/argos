import type { ProjectEventName } from "@argos/schemas/project-event";
import { assertNever } from "@argos/util/assertNever";
import * as Sentry from "@sentry/node";
import type { WithGraphModel } from "objection";

import {
  serializeEventData,
  type EventMessage,
} from "@/api/schema/primitives/event";
import { transaction } from "@/database";
import {
  ProjectEvent,
  Webhook,
  WebhookDelivery,
  WebhookProject,
  type Project,
} from "@/database/models";
import { webhookDeliveryJob } from "@/webhook/job";

/**
 * Advisory lock taken by every event insert. Ids are allocated when an insert
 * starts, not when it commits: holding the lock until commit makes events
 * commit in id order, so a feed reader that sees an id has seen every id below
 * it.
 */
const EVENT_INSERT_LOCK = 4_172_043_513;

/**
 * The project the event happened in, with its account. Callers usually hold
 * it already: a build's relation is reused when fetched, and deployment
 * messages carry it.
 */
async function getEventProject(
  message: EventMessage,
): Promise<WithGraphModel<Project, "account">> {
  switch (message.name) {
    case "build.completed":
    case "build.reviewed": {
      const { project } = await message.build.$fetchGraph("project.account", {
        skipFetched: true,
      });
      return project;
    }
    case "deployment.created":
    case "deployment.ready":
      return message.project;
    default:
      return assertNever(message);
  }
}

/**
 * The webhooks subscribed to the event, either for every project of the
 * project's account or for this one.
 *
 * Matching on the project's current account is what keeps a transferred
 * project's events away from the webhooks of the account it left.
 */
function querySubscribedWebhooks(project: Project, name: ProjectEventName) {
  return Webhook.query()
    .where("webhooks.accountId", project.accountId)
    .whereRaw(`"webhooks"."events" @> ?::jsonb`, [JSON.stringify([name])])
    .where((query) =>
      query
        .where("webhooks.allProjects", true)
        .orWhereExists(
          WebhookProject.query()
            .whereColumn("webhook_projects.webhookId", "webhooks.id")
            .where("webhook_projects.projectId", project.id),
        ),
    );
}

/**
 * Record an event in the project's feed and send it to the webhooks
 * subscribed to it.
 */
export async function sendProjectEvent(
  message: EventMessage,
): Promise<ProjectEvent> {
  const project = await getEventProject(message);
  const [data, webhooks] = await Promise.all([
    serializeEventData(message, project),
    querySubscribedWebhooks(project, message.name),
  ]);
  // The deliveries commit with their event: a push that fails after the
  // commit leaves them pending, for `webhookDeliveryJob.requeueStalled`.
  const { event, deliveries } = await transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(?)", [EVENT_INSERT_LOCK]);
    const event = await ProjectEvent.query(trx).insert({
      projectId: project.id,
      name: message.name,
      data,
    });
    const deliveries =
      webhooks.length > 0
        ? await WebhookDelivery.query(trx).insert(
            webhooks.map((webhook) => ({
              webhookId: webhook.id,
              eventId: event.id,
              jobStatus: "pending" as const,
            })),
          )
        : [];
    return { event, deliveries };
  });

  if (deliveries.length > 0) {
    await webhookDeliveryJob.push(...deliveries.map((delivery) => delivery.id));
  }

  return event;
}

/**
 * Send the event of an action that already happened. A failure is reported
 * rather than thrown, so it cannot fail that action.
 */
export async function trySendProjectEvent(
  message: EventMessage,
): Promise<void> {
  try {
    await sendProjectEvent(message);
  } catch (error) {
    Sentry.captureException(error);
  }
}
