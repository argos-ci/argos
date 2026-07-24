import gqlTag from "graphql-tag";
import { UniqueViolationError } from "objection";

import { MsTeamsWebhook, type Account, type User } from "@/database/models";
import { parseMsTeamsWebhookUrl, postCardToUrl } from "@/msteams/webhook";
import { HTTPError } from "@/util/error";

import type { IResolvers } from "../__generated__/resolver-types";
import { getAdminAccount } from "../services/account";
import { badUserInput, notFound } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type MsTeamsWebhook implements Node {
    id: ID!
    name: String!
    connectedAt: DateTime!
  }

  input CreateMsTeamsWebhookInput {
    accountId: ID!
    name: String!
    url: String!
  }

  input DeleteMsTeamsWebhookInput {
    id: ID!
  }

  input TestMsTeamsWebhookInput {
    id: ID!
  }

  extend type Mutation {
    "Register a Microsoft Teams incoming webhook"
    createMsTeamsWebhook(input: CreateMsTeamsWebhookInput!): Account!
    "Remove a Microsoft Teams incoming webhook"
    deleteMsTeamsWebhook(input: DeleteMsTeamsWebhookInput!): Account!
    "Send a sample card to check a Microsoft Teams webhook works"
    testMsTeamsWebhook(input: TestMsTeamsWebhookInput!): Boolean!
  }
`;

/**
 * Run an operation that talks to (or validates) a Microsoft Teams webhook and
 * translate its failure into a user-facing GraphQL error.
 *
 * `parseMsTeamsWebhookUrl` and `postCardToUrl` throw `HTTPError`, which Apollo
 * reports as INTERNAL_SERVER_ERROR — every pasted typo or deleted flow would
 * otherwise page the team through Sentry.
 */
async function asUserFacing<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HTTPError) {
      throw badUserInput(error.message);
    }
    throw error;
  }
}

/**
 * Load a webhook along with its account, checking the user administrates it.
 */
async function getAdminWebhook(args: {
  id: string;
  user: User | undefined | null;
}): Promise<{ webhook: MsTeamsWebhook; account: Account }> {
  const webhook = await MsTeamsWebhook.query().findById(args.id);

  if (!webhook) {
    throw notFound("Microsoft Teams webhook not found.");
  }

  // Throws when the user is not an admin of the owning account.
  const account = await getAdminAccount({
    id: webhook.accountId,
    user: args.user,
  });

  return { webhook, account };
}

export const resolvers: IResolvers = {
  Mutation: {
    createMsTeamsWebhook: async (_root, args, ctx) => {
      const { accountId, name, url } = args.input;

      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
      });

      const trimmedName = name.trim();

      if (!trimmedName) {
        throw badUserInput("Please give the webhook a name.");
      }

      // Throws a user-facing error when the URL is not a Teams endpoint.
      const parsedUrl = await asUserFacing(() => parseMsTeamsWebhookUrl(url));

      const existing = await MsTeamsWebhook.query().findOne({
        accountId: account.id,
        name: trimmedName,
      });

      if (existing) {
        throw badUserInput(
          `A Microsoft Teams webhook named "${trimmedName}" already exists.`,
        );
      }

      try {
        await MsTeamsWebhook.query().insert({
          accountId: account.id,
          name: trimmedName,
          url: parsedUrl,
          connectedAt: new Date().toISOString(),
        });
      } catch (error) {
        // The check above races two concurrent submits; the unique constraint
        // is what actually decides, so report it the same way.
        if (error instanceof UniqueViolationError) {
          throw badUserInput(
            `A Microsoft Teams webhook named "${trimmedName}" already exists.`,
          );
        }
        throw error;
      }

      return account;
    },
    deleteMsTeamsWebhook: async (_root, args, ctx) => {
      const { webhook, account } = await getAdminWebhook({
        id: args.input.id,
        user: ctx.auth?.user,
      });

      await webhook.$query().delete();

      return account;
    },
    testMsTeamsWebhook: async (_root, args, ctx) => {
      const { webhook } = await getAdminWebhook({
        id: args.input.id,
        user: ctx.auth?.user,
      });

      await asUserFacing(() =>
        postCardToUrl({
          url: webhook.url,
          card: {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.5",
            body: [
              {
                type: "TextBlock",
                text: "Argos is connected 🎉",
                wrap: true,
                size: "medium",
                weight: "bolder",
              },
              {
                type: "TextBlock",
                text: "Build notifications for this channel will look like this.",
                wrap: true,
                isSubtle: true,
                spacing: "none",
              },
            ],
          },
        }),
      );

      return true;
    },
  },
};
