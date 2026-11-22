import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { WebhookDeliveryStatus, WebhookEvent } from "@/gql/graphql";

import {
  WebhookDeliveriesCard,
  WebhookDeliveryDetail,
} from "./WebhookDeliveries";

type Webhook = ComponentProps<typeof WebhookDeliveriesCard>["webhook"];
type Delivery = ComponentProps<typeof WebhookDeliveryDetail>["delivery"];

const eventBody = JSON.stringify({
  id: "4821",
  type: "build.completed",
  timestamp: "2026-11-20T09:00:00.000Z",
  data: {
    project: {
      id: "1",
      name: "web",
      account: { id: "1", slug: "acme" },
      url: "https://app.argos-ci.com/acme/web",
    },
    build: {
      id: "912",
      number: 412,
      status: "changes-detected",
      conclusion: "changes-detected",
      url: "https://app.argos-ci.com/acme/web/builds/412",
    },
  },
});

const delivered = {
  __typename: "WebhookDelivery",
  id: "3",
  status: WebhookDeliveryStatus.Success,
  attempts: 1,
  attemptedAt: "2026-11-20T09:00:01.000Z",
  responseStatus: 200,
  durationMs: 184,
  responseBody: '{"received":true}',
  failureReason: null,
  event: {
    __typename: "WebhookDeliveryEvent",
    id: "4821",
    type: WebhookEvent.BuildCompleted,
    timestamp: "2026-11-20T09:00:00.000Z",
    body: eventBody,
  },
} satisfies Delivery;

const webhook = {
  __typename: "Webhook",
  id: "1",
  url: "https://hooks.acme.com/argos",
  events: [WebhookEvent.BuildCompleted, WebhookEvent.BuildReviewed],
  allProjects: true,
  projects: [],
  deliveries: {
    __typename: "WebhookDeliveryConnection",
    pageInfo: { __typename: "PageInfo", hasNextPage: true },
    edges: [
      {
        __typename: "WebhookDelivery",
        id: "3",
        status: WebhookDeliveryStatus.Success,
        attempts: 1,
        responseStatus: 200,
        createdAt: "2026-11-20T09:00:00.000Z",
        event: {
          __typename: "WebhookDeliveryEvent",
          id: "4821",
          type: WebhookEvent.BuildCompleted,
        },
      },
      {
        __typename: "WebhookDelivery",
        id: "2",
        status: WebhookDeliveryStatus.Failed,
        attempts: 1,
        responseStatus: 307,
        createdAt: "2026-11-19T17:30:00.000Z",
        event: {
          __typename: "WebhookDeliveryEvent",
          id: "4790",
          type: WebhookEvent.BuildReviewed,
        },
      },
      {
        __typename: "WebhookDelivery",
        id: "1",
        status: WebhookDeliveryStatus.Pending,
        attempts: 0,
        responseStatus: null,
        createdAt: "2026-11-19T16:00:00.000Z",
        event: {
          __typename: "WebhookDeliveryEvent",
          id: "4788",
          type: WebhookEvent.BuildCompleted,
        },
      },
    ],
  },
} satisfies Webhook;

const noDeliveries = {
  ...webhook,
  deliveries: {
    __typename: "WebhookDeliveryConnection",
    pageInfo: { __typename: "PageInfo", hasNextPage: false },
    edges: [],
  },
} satisfies Webhook;

const noop = async () => {};

const meta = {
  title: "Containers/WebhookDeliveries",
  component: WebhookDeliveriesCard,
  args: {
    webhook,
    filters: { status: null, eventId: null },
    onFiltersChange: () => {},
    selectedId: "3",
    onSelect: () => {},
    onRefresh: noop,
    onLoadMore: () => {},
    detail: <WebhookDeliveryDetail delivery={delivered} onResend={noop} />,
  },
} satisfies Meta<typeof WebhookDeliveriesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { webhook: noDeliveries, selectedId: null, detail: null },
};

export const NoMatch: Story = {
  args: {
    webhook: noDeliveries,
    filters: { status: WebhookDeliveryStatus.Failed, eventId: null },
    selectedId: null,
    detail: null,
  },
};

export const Delivered: Story = {};

export const Retrying: Story = {
  args: {
    detail: (
      <WebhookDeliveryDetail
        delivery={{
          ...delivered,
          status: WebhookDeliveryStatus.Pending,
          responseStatus: 500,
          durationMs: 1203,
          responseBody: "Internal Server Error",
          failureReason: "Your endpoint responded with HTTP 500.",
        }}
        onResend={noop}
      />
    ),
  },
};

export const Failed: Story = {
  args: {
    selectedId: "2",
    detail: (
      <WebhookDeliveryDetail
        delivery={{
          ...delivered,
          id: "2",
          status: WebhookDeliveryStatus.Failed,
          responseStatus: 307,
          durationMs: 92,
          responseBody: "",
          failureReason:
            "Your endpoint redirected with HTTP 307. Argos does not follow redirects: use the final URL.",
        }}
        onResend={noop}
      />
    ),
  },
};

export const Sending: Story = {
  args: {
    selectedId: "1",
    detail: (
      <WebhookDeliveryDetail
        delivery={{
          ...delivered,
          id: "1",
          status: WebhookDeliveryStatus.Pending,
          attempts: 0,
          attemptedAt: null,
          responseStatus: null,
          durationMs: null,
          responseBody: null,
        }}
        onResend={noop}
      />
    ),
  },
};
