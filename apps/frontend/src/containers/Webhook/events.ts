import { WebhookEvent } from "@/gql/graphql";

export const WEBHOOK_EVENTS = [
  {
    value: WebhookEvent.BuildCompleted,
    name: "build.completed",
    description: "A build finishes comparing its screenshots.",
  },
  {
    value: WebhookEvent.BuildReviewed,
    name: "build.reviewed",
    description: "A build receives a review.",
  },
  {
    value: WebhookEvent.DeploymentCreated,
    name: "deployment.created",
    description: "A deployment starts uploading its files.",
  },
  {
    value: WebhookEvent.DeploymentReady,
    name: "deployment.ready",
    description: "A deployment is ready to be served.",
  },
] satisfies { value: WebhookEvent; name: string; description: string }[];

export function formatWebhookEvents(events: readonly WebhookEvent[]): string {
  return WEBHOOK_EVENTS.filter((event) => events.includes(event.value))
    .map((event) => event.name)
    .join(", ");
}
