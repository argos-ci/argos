import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import { UniqueViolationError } from "objection";

import { MsTeamsWebhook, type Account, type User } from "@/database/models";
import {
  obfuscateMsTeamsWebhookUrl,
  parseMsTeamsWebhookUrl,
  postCardToUrl,
} from "@/msteams/webhook";

import type { IResolvers } from "../__generated__/resolver-types";
import { getAdminAccount } from "../services/account";
import { badUserInput, notFound, toGraphQLError } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type MsTeamsWebhook implements Node {
    id: ID!
    name: String!
    "Webhook URL, with its signature obfuscated for non-admins"
    url: String!
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
  MsTeamsWebhook: {
    url: async (webhook, _args, ctx) => {
      const account = await ctx.loaders.Account.load(webhook.accountId);
      invariant(account, "account not found");
      const permissions = await account.$getPermissions(ctx.auth?.user ?? null);
      if (!permissions.includes("admin")) {
        // Posting to the webhook is an admin action, so only admins get the
        // credential it embeds.
        return obfuscateMsTeamsWebhookUrl(webhook.url);
      }
      return webhook.url;
    },
  },
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

      const parsedUrl = (() => {
        try {
          return parseMsTeamsWebhookUrl(url);
        } catch (error) {
          // Rejects anything that is not a Teams endpoint, as a user error.
          throw toGraphQLError(error);
        }
      })();

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

      try {
        await postCardToUrl({
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
        });
      } catch (error) {
        // A rejected webhook is the user's to fix; only a Teams outage (5xx)
        // stays an internal error.
        throw toGraphQLError(error);
      }

      return true;
    },
  },
};
