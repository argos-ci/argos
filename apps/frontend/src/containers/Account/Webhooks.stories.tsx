import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { WebhookDeliveryStatus, WebhookEvent } from "@/gql/graphql";

import { AccountWebhooks } from "./Webhooks";

type Account = ComponentProps<typeof AccountWebhooks>["account"];

const account = {
  __typename: "Team",
  id: "1",
  webhooks: [],
  accountProjects: {
    __typename: "ProjectConnection",
    edges: [
      { __typename: "Project", id: "1", name: "web" },
      { __typename: "Project", id: "2", name: "docs" },
    ],
  },
} satisfies Account;

const meta = {
  title: "Containers/AccountWebhooks",
  component: AccountWebhooks,
  args: { account },
} satisfies Meta<typeof AccountWebhooks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithWebhooks: Story = {
  args: {
    account: {
      ...account,
      webhooks: [
        {
          __typename: "Webhook",
          id: "2",
          url: "https://hooks.acme.com/argos",
          events: [WebhookEvent.BuildCompleted, WebhookEvent.BuildReviewed],
          allProjects: true,
          createdAt: "2026-11-10T09:00:00.000Z",
          projects: [],
          lastDelivery: {
            __typename: "WebhookDelivery",
            id: "8",
            status: WebhookDeliveryStatus.Success,
            attempts: 1,
            failureReason: null,
            createdAt: "2026-11-20T09:00:00.000Z",
          },
        },
        {
          __typename: "Webhook",
          id: "1",
          url: "https://deploys.acme.com/hooks",
          events: [WebhookEvent.DeploymentReady],
          allProjects: false,
          createdAt: "2026-11-02T09:00:00.000Z",
          projects: [{ __typename: "Project", id: "1", name: "web" }],
          lastDelivery: null,
        },
      ],
    },
  },
};
