import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import { UniqueViolationError } from "objection";

import { DiscordWebhook, type Account, type User } from "@/database/models";
import { EMBED_COLOR } from "@/discord/embed";
import {
  obfuscateDiscordWebhookUrl,
  parseDiscordWebhookUrl,
  postEmbedToUrl,
} from "@/discord/webhook";

import type { IResolvers } from "../__generated__/resolver-types";
import { getAdminAccount } from "../services/account";
import { badUserInput, notFound, toGraphQLError } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type DiscordWebhook implements Node {
    id: ID!
    name: String!
    "Webhook URL, with its token obfuscated for non-admins"
    url: String!
    connectedAt: DateTime!
  }

  input CreateDiscordWebhookInput {
    accountId: ID!
    name: String!
    url: String!
  }

  input DeleteDiscordWebhookInput {
    id: ID!
  }

  input TestDiscordWebhookInput {
    id: ID!
  }

  extend type Mutation {
    "Register a Discord channel webhook"
    createDiscordWebhook(input: CreateDiscordWebhookInput!): Account!
    "Remove a Discord channel webhook"
    deleteDiscordWebhook(input: DeleteDiscordWebhookInput!): Account!
    "Send a sample message to check a Discord webhook works"
    testDiscordWebhook(input: TestDiscordWebhookInput!): Boolean!
  }
`;

/**
 * Load a webhook along with its account, checking the user administrates it.
 */
async function getAdminWebhook(args: {
  id: string;
  user: User | undefined | null;
}): Promise<{ webhook: DiscordWebhook; account: Account }> {
  const webhook = await DiscordWebhook.query().findById(args.id);

  if (!webhook) {
    throw notFound("Discord webhook not found.");
  }

  // Throws when the user is not an admin of the owning account.
  const account = await getAdminAccount({
    id: webhook.accountId,
    user: args.user,
  });

  return { webhook, account };
}

export const resolvers: IResolvers = {
  DiscordWebhook: {
    url: async (webhook, _args, ctx) => {
      const account = await ctx.loaders.Account.load(webhook.accountId);
      invariant(account, "account not found");
      const permissions = await account.$getPermissions(ctx.auth?.user ?? null);
      if (!permissions.includes("admin")) {
        // Posting to the webhook is an admin action, so only admins get the
        // credential it embeds.
        return obfuscateDiscordWebhookUrl(webhook.url);
      }
      return webhook.url;
    },
  },
  Mutation: {
    createDiscordWebhook: async (_root, args, ctx) => {
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
          return parseDiscordWebhookUrl(url);
        } catch (error) {
          // Rejects anything that is not a Discord webhook, as a user error.
          throw toGraphQLError(error);
        }
      })();

      const existing = await DiscordWebhook.query().findOne({
        accountId: account.id,
        name: trimmedName,
      });

      if (existing) {
        throw badUserInput(
          `A Discord webhook named "${trimmedName}" already exists.`,
        );
      }

      try {
        await DiscordWebhook.query().insert({
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
            `A Discord webhook named "${trimmedName}" already exists.`,
          );
        }
        throw error;
      }

      return account;
    },
    deleteDiscordWebhook: async (_root, args, ctx) => {
      const { webhook, account } = await getAdminWebhook({
        id: args.input.id,
        user: ctx.auth?.user,
      });

      await webhook.$query().delete();

      return account;
    },
    testDiscordWebhook: async (_root, args, ctx) => {
      const { webhook } = await getAdminWebhook({
        id: args.input.id,
        user: ctx.auth?.user,
      });

      try {
        await postEmbedToUrl({
          url: webhook.url,
          embed: {
            title: "Argos is connected 🎉",
            color: EMBED_COLOR,
            description:
              "Build notifications for this channel will look like this.",
          },
        });
      } catch (error) {
        // A rejected webhook is the user's to fix; only a Discord outage (5xx)
        // stays an internal error.
        throw toGraphQLError(error);
      }

      return true;
    },
  },
};
