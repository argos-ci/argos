import {
  PROJECT_EVENT_DESCRIPTIONS,
  PROJECT_EVENTS,
  type ProjectEventName,
} from "@argos/schemas/project-event";

import { WebhookEvent } from "@/gql/graphql";

const GRAPHQL_EVENTS = {
  "build.completed": WebhookEvent.BuildCompleted,
  "build.reviewed": WebhookEvent.BuildReviewed,
  "deployment.created": WebhookEvent.DeploymentCreated,
  "deployment.ready": WebhookEvent.DeploymentReady,
} satisfies Record<ProjectEventName, WebhookEvent>;

export const WEBHOOK_EVENTS = PROJECT_EVENTS.map((name) => ({
  name,
  value: GRAPHQL_EVENTS[name],
  description: PROJECT_EVENT_DESCRIPTIONS[name],
}));

export function formatWebhookEvents(events: readonly WebhookEvent[]): string {
  return WEBHOOK_EVENTS.filter((event) => events.includes(event.value))
    .map((event) => event.name)
    .join(", ");
}
