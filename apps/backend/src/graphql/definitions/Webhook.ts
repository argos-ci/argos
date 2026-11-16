import type { ProjectEventName } from "@argos/schemas/project-event";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { serializeEvent } from "@/api/schema/primitives/event";
import type { AuthViewer } from "@/auth/payload";
import { Webhook, WebhookDelivery } from "@/database/models";
import { loadAccountById } from "@/database/services/team-member";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { boom } from "@/util/error";
import {
  createWebhook,
  deleteWebhook,
  getAccountWebhook,
  listAccountWebhooks,
  listWebhookDeliveries,
  resendWebhookDelivery,
  type WebhookDeliveryStatus,
} from "@/webhook/manage";

import {
  IWebhookDeliveryStatus,
  IWebhookEvent,
  type IResolvers,
} from "../__generated__/resolver-types";
import { toGraphQLError, unauthenticated } from "../util";
import { paginateResult } from "./PageInfo";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum WebhookEvent {
    build_completed
    build_reviewed
    deployment_created
    deployment_ready
  }

  enum WebhookDeliveryStatus {
    pending
    success
    failed
  }

  "An endpoint Argos posts the events of an account's projects to, each request signed with the webhook's secret."
  type Webhook implements Node {
    id: ID!
    url: String!
    events: [WebhookEvent!]!
    "Whether the webhook receives the events of every project of the account, including the ones created later"
    allProjects: Boolean!
    "The live projects the webhook receives the events of, empty when it covers all projects"
    projects: [Project!]!
    createdAt: DateTime!
    "The most recent delivery, null until the first event"
    lastDelivery: WebhookDelivery
    "The deliveries kept, most recent first"
    deliveries(
      after: Int = 0
      first: Int = 30
      status: WebhookDeliveryStatus
      "Only the deliveries of this event"
      eventId: ID
    ): WebhookDeliveryConnection!
    "One of the webhook's deliveries, null when it has none with this id"
    delivery(id: ID!): WebhookDelivery
  }

  type WebhookDeliveryConnection implements Connection {
    pageInfo: PageInfo!
    edges: [WebhookDelivery!]!
  }

  "An event sent to a webhook, across all of its attempts"
  type WebhookDelivery implements Node {
    id: ID!
    status: WebhookDeliveryStatus!
    attempts: Int!
    "When the latest attempt was made, null before the first one"
    attemptedAt: DateTime
    "HTTP status of the latest attempt, null when it got no response"
    responseStatus: Int
    "How long the latest attempt waited for a response, in milliseconds"
    durationMs: Int
    "The start of the latest response body"
    responseBody: String
    "Why the latest attempt failed, null when it succeeded"
    failureReason: String
    createdAt: DateTime!
    event: WebhookDeliveryEvent!
  }

  "An event as webhooks receive it"
  type WebhookDeliveryEvent {
    id: ID!
    type: WebhookEvent!
    "When the event happened"
    timestamp: DateTime!
    "The JSON body of the request"
    body: String!
  }

  type CreateWebhookPayload {
    webhook: Webhook!
    "The signing secret, only returned once at creation"
    secret: String!
    "The account owning the webhook, to refresh its list"
    account: Account!
  }

  input CreateWebhookInput {
    accountId: ID!
    url: String!
    events: [WebhookEvent!]!
    "The projects to receive the events of, null for all projects"
    projectIds: [ID!]
  }

  input DeleteWebhookInput {
    id: ID!
  }

  input ResendWebhookDeliveryInput {
    id: ID!
  }

  extend interface Account {
    "The account's webhooks, null when the viewer is not an administrator"
    webhooks: [Webhook!]
    "A webhook of the account, null when not found or the viewer is not an administrator"
    webhook(id: ID!): Webhook
  }

  extend type Team {
    webhooks: [Webhook!]
    webhook(id: ID!): Webhook
  }

  extend type User {
    webhooks: [Webhook!]
    webhook(id: ID!): Webhook
  }

  extend type Mutation {
    "Create a webhook"
    createWebhook(input: CreateWebhookInput!): CreateWebhookPayload!
    "Delete a webhook, returning its id"
    deleteWebhook(input: DeleteWebhookInput!): ID!
    "Send a delivery's event to its webhook again, returning the new delivery"
    resendWebhookDelivery(input: ResendWebhookDeliveryInput!): WebhookDelivery!
  }
`;

const EVENT_TO_GRAPHQL = {
  "build.completed": IWebhookEvent.BuildCompleted,
  "build.reviewed": IWebhookEvent.BuildReviewed,
  "deployment.created": IWebhookEvent.DeploymentCreated,
  "deployment.ready": IWebhookEvent.DeploymentReady,
} satisfies Record<ProjectEventName, IWebhookEvent>;

const EVENT_FROM_GRAPHQL = {
  [IWebhookEvent.BuildCompleted]: "build.completed",
  [IWebhookEvent.BuildReviewed]: "build.reviewed",
  [IWebhookEvent.DeploymentCreated]: "deployment.created",
  [IWebhookEvent.DeploymentReady]: "deployment.ready",
} satisfies Record<IWebhookEvent, ProjectEventName>;

const STATUS_FROM_GRAPHQL = {
  [IWebhookDeliveryStatus.Pending]: "pending",
  [IWebhookDeliveryStatus.Success]: "success",
  [IWebhookDeliveryStatus.Failed]: "failed",
} satisfies Record<IWebhookDeliveryStatus, WebhookDeliveryStatus>;

function assertAuth(auth: AuthViewer | null): AuthViewer {
  if (!auth) {
    throw unauthenticated();
  }
  return auth;
}

const accountResolvers: Pick<
  NonNullable<IResolvers["Team"]>,
  "webhooks" | "webhook"
> = {
  webhooks: (account, _args, ctx) =>
    listAccountWebhooks({ account, auth: assertAuth(ctx.auth) }),
  webhook: (account, args, ctx) =>
    getAccountWebhook({ account, auth: assertAuth(ctx.auth), id: args.id }),
};

export const resolvers: IResolvers = {
  Webhook: {
    events: (webhook) => webhook.events.map((event) => EVENT_TO_GRAPHQL[event]),
    projects: async (webhook, _args, ctx) => {
      if (webhook.allProjects) {
        return [];
      }
      return ctx.loaders.WebhookProjects.load(webhook.id);
    },
    lastDelivery: (webhook, _args, ctx) =>
      ctx.loaders.WebhookLastDelivery.load(webhook.id),
    deliveries: async (webhook, args) => {
      const result = await listWebhookDeliveries({
        webhookId: webhook.id,
        status: args.status ? STATUS_FROM_GRAPHQL[args.status] : null,
        eventId: args.eventId ?? null,
        after: args.after,
        first: args.first,
      });
      return paginateResult({ result, after: args.after, first: args.first });
    },
    delivery: async (webhook, args) => {
      if (!isValidPgBigInt(args.id)) {
        return null;
      }
      const delivery = await WebhookDelivery.query().findOne({
        id: args.id,
        webhookId: webhook.id,
      });
      return delivery ?? null;
    },
  },
  WebhookDeliveryEvent: {
    type: (event) => EVENT_TO_GRAPHQL[event.name],
    timestamp: (event) => new Date(event.createdAt),
    body: (event) => JSON.stringify(serializeEvent(event)),
  },
  WebhookDelivery: {
    status: (delivery) => {
      switch (delivery.conclusion) {
        case null:
          return IWebhookDeliveryStatus.Pending;
        case "success":
          return IWebhookDeliveryStatus.Success;
        case "failed":
          return IWebhookDeliveryStatus.Failed;
        default:
          return assertNever(delivery.conclusion);
      }
    },
    event: async (delivery, _args, ctx) => {
      const event = await ctx.loaders.ProjectEvent.load(delivery.eventId);
      invariant(event, `Event not found: ${delivery.eventId}`);
      return event;
    },
  },
  Team: accountResolvers,
  User: accountResolvers,
  Mutation: {
    createWebhook: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const { accountId, url, events, projectIds } = args.input;
      try {
        const account = await loadAccountById(accountId);
        const { webhook, secret } = await createWebhook({
          account,
          auth: ctx.auth,
          url,
          events: events.map((event) => EVENT_FROM_GRAPHQL[event]),
          projectIds: projectIds ?? null,
        });
        return { webhook, secret, account };
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    deleteWebhook: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const webhook = isValidPgBigInt(args.input.id)
          ? await Webhook.query().findById(args.input.id)
          : null;
        if (!webhook) {
          throw boom(404, "Webhook not found.");
        }
        await deleteWebhook({ webhook, auth: ctx.auth });
        return webhook.id;
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    resendWebhookDelivery: async (_root, args, ctx) => {
      const auth = assertAuth(ctx.auth);
      try {
        const delivery = isValidPgBigInt(args.input.id)
          ? await WebhookDelivery.query().findById(args.input.id)
          : null;
        if (!delivery) {
          throw boom(404, "Delivery not found.");
        }
        return await resendWebhookDelivery({ delivery, auth });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
  },
};
