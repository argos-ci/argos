import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { WebhookDeliveryStatus, WebhookEvent } from "@/gql/graphql";

import { WebhookList } from "./WebhookList";

type Webhook = ComponentProps<typeof WebhookList>["webhooks"][number];

const webhook = {
  __typename: "Webhook",
  id: "1",
  url: "https://hooks.acme.com/argos",
  events: [WebhookEvent.BuildCompleted, WebhookEvent.BuildReviewed],
  allProjects: true,
  createdAt: "2026-11-02T09:00:00.000Z",
  projects: [],
  lastDelivery: null,
} satisfies Webhook;

function withLastDelivery(
  lastDelivery: Partial<NonNullable<Webhook["lastDelivery"]>>,
): Webhook {
  return {
    ...webhook,
    allProjects: false,
    projects: [
      { __typename: "Project", id: "1", name: "web" },
      { __typename: "Project", id: "2", name: "docs" },
    ],
    lastDelivery: {
      __typename: "WebhookDelivery",
      id: "1",
      status: WebhookDeliveryStatus.Success,
      attempts: 1,
      failureReason: null,
      createdAt: "2026-11-20T09:00:00.000Z",
      ...lastDelivery,
    },
  };
}

const meta = {
  title: "Containers/WebhookList",
  component: WebhookList,
  args: { webhooks: [webhook] },
} satisfies Meta<typeof WebhookList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoDelivery: Story = {};

export const Sending: Story = {
  args: {
    webhooks: [
      withLastDelivery({ status: WebhookDeliveryStatus.Pending, attempts: 0 }),
    ],
  },
};

export const Retrying: Story = {
  args: {
    webhooks: [
      withLastDelivery({
        status: WebhookDeliveryStatus.Pending,
        attempts: 1,
        failureReason: "Your endpoint responded with HTTP 500.",
      }),
    ],
  },
};

export const Failed: Story = {
  args: {
    webhooks: [
      {
        ...withLastDelivery({
          status: WebhookDeliveryStatus.Failed,
          attempts: 4,
          failureReason: "Your endpoint did not respond within 10 seconds.",
        }),
        // Every project it was limited to was deleted.
        projects: [],
      },
    ],
  },
};

export const Delivered: Story = {
  args: { webhooks: [withLastDelivery({})] },
};

export const LongUrl: Story = {
  args: {
    webhooks: [
      {
        ...withLastDelivery({}),
        url: "https://hooks.acme-corporation-internal-tools.example.com/integrations/argos/visual-testing/events?source=argos&token=7f3c9e2a",
        events: Object.values(WebhookEvent),
        projects: [
          "web",
          "docs",
          "design-system",
          "marketing-site",
          "mobile-app",
        ].map((name, index) => ({
          __typename: "Project" as const,
          id: String(index + 1),
          name,
        })),
      },
    ],
  },
};
