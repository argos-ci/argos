import type { ProjectEventName } from "@argos/schemas/project-event";
import { assertNever } from "@argos/util/assertNever";
import gqlTag from "graphql-tag";

import type { AuthViewer } from "@/auth/payload";
import { Webhook, type Account } from "@/database/models";
import { loadAccountById } from "@/database/services/team-member";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { boom } from "@/util/error";
import {
  createWebhook,
  deleteWebhook,
  listAccountWebhooks,
} from "@/webhook/manage";

import {
  IWebhookDeliveryStatus,
  IWebhookEvent,
  type IResolvers,
} from "../__generated__/resolver-types";
import { toGraphQLError, unauthenticated } from "../util";

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
  }

  "An event sent to a webhook, across all of its attempts"
  type WebhookDelivery implements Node {
    id: ID!
    status: WebhookDeliveryStatus!
    attempts: Int!
    "HTTP status of the latest attempt, null when it got no response"
    responseStatus: Int
    "Why the latest attempt failed, null when it succeeded"
    failureReason: String
    createdAt: DateTime!
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

  extend interface Account {
    "The account's webhooks, null when the viewer is not an administrator"
    webhooks: [Webhook!]
  }

  extend type Team {
    webhooks: [Webhook!]
  }

  extend type User {
    webhooks: [Webhook!]
  }

  extend type Mutation {
    "Create a webhook"
    createWebhook(input: CreateWebhookInput!): CreateWebhookPayload!
    "Delete a webhook, returning its id"
    deleteWebhook(input: DeleteWebhookInput!): ID!
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

async function resolveAccountWebhooks(
  account: Account,
  auth: AuthViewer | null,
) {
  if (!auth) {
    throw unauthenticated();
  }
  return listAccountWebhooks({ account, auth });
}

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
  },
  Team: {
    webhooks: (account, _args, ctx) =>
      resolveAccountWebhooks(account, ctx.auth),
  },
  User: {
    webhooks: (account, _args, ctx) =>
      resolveAccountWebhooks(account, ctx.auth),
  },
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
  },
};
