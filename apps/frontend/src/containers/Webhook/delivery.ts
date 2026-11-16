import { assertNever } from "@argos/util/assertNever";

import { WebhookDeliveryStatus } from "@/gql/graphql";
import type { ChipColor } from "@/ui/Chip";

export function getDeliveryChip(delivery: {
  status: WebhookDeliveryStatus;
  attempts: number;
}): { label: string; color: ChipColor } {
  switch (delivery.status) {
    case WebhookDeliveryStatus.Success:
      return { label: "Delivered", color: "success" };
    case WebhookDeliveryStatus.Failed:
      return { label: "Failed", color: "danger" };
    case WebhookDeliveryStatus.Pending:
      return delivery.attempts > 0
        ? { label: "Retrying", color: "warning" }
        : { label: "Sending", color: "pending" };
    default:
      return assertNever(delivery.status);
  }
}

export function getProjectsLabel(webhook: {
  allProjects: boolean;
  projects: { name: string }[];
}): string {
  if (webhook.allProjects) {
    return "All projects";
  }
  return webhook.projects.length > 0
    ? webhook.projects.map((project) => project.name).join(", ")
    : "No project";
}
