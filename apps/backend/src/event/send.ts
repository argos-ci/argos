import type { ProjectEventName } from "@argos/schemas/project-event";
import { invariant } from "@argos/util/invariant";

import {
  getEventProjectId,
  serializeEventData,
  type EventMessage,
} from "@/api/schema/primitives/event";
import {
  Project,
  ProjectEvent,
  Webhook,
  WebhookDelivery,
  WebhookProject,
} from "@/database/models";
import { webhookDeliveryJob } from "@/webhook/job";

/**
 * The webhooks subscribed to the event, either for every project of the
 * project's account or for this one.
 *
 * Matching on the project's current account is what keeps a transferred
 * project's events away from the webhooks of the account it left.
 */
function querySubscribedWebhooks(projectId: string, name: ProjectEventName) {
  return Webhook.query()
    .whereIn(
      "webhooks.accountId",
      Project.query()
        .select("projects.accountId")
        .where("projects.id", projectId),
    )
    .whereRaw(`"webhooks"."events" @> ?::jsonb`, [JSON.stringify([name])])
    .where((query) =>
      query
        .where("webhooks.allProjects", true)
        .orWhereExists(
          WebhookProject.query()
            .whereColumn("webhook_projects.webhookId", "webhooks.id")
            .where("webhook_projects.projectId", projectId),
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
  const projectId = getEventProjectId(message);
  const project = await Project.query()
    .findById(projectId)
    .withGraphFetched("account");
  invariant(project, `Project not found: ${projectId}`);

  const [data, webhooks] = await Promise.all([
    serializeEventData(message, project),
    querySubscribedWebhooks(projectId, message.name),
  ]);
  const event = await ProjectEvent.query().insertAndFetch({
    projectId,
    name: message.name,
    data,
  });

  if (webhooks.length > 0) {
    const deliveries = await WebhookDelivery.query().insert(
      webhooks.map((webhook) => ({
        webhookId: webhook.id,
        eventId: event.id,
        jobStatus: "pending" as const,
      })),
    );
    await webhookDeliveryJob.push(...deliveries.map((delivery) => delivery.id));
  }

  return event;
}
