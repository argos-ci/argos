import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { UserNotificationPreference } from "@/database/models";
import {
  getConfigurableNotificationCategories,
  NOTIFICATION_CHANNELS,
  notificationCategoryMetadata,
} from "@/notification/categories";

import type {
  INotificationPreference,
  IResolvers,
} from "../__generated__/resolver-types";
import { badUserInput, forbidden, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum NotificationCategory {
    review
    billing
    project
    integration
  }

  enum NotificationChannel {
    email
  }

  type NotificationPreference {
    id: ID!
    category: NotificationCategory!
    channel: NotificationChannel!
    enabled: Boolean!
    "Human-readable label for the category"
    label: String!
    "Description of what the category covers"
    description: String!
  }

  extend type User {
    "Notification preferences, one per configurable category and channel"
    notificationPreferences: [NotificationPreference!]!
  }

  input UpdateNotificationPreferenceInput {
    category: NotificationCategory!
    channel: NotificationChannel!
    enabled: Boolean!
  }

  extend type Mutation {
    "Enable or disable a notification category on a channel for the authenticated user"
    updateNotificationPreference(
      input: UpdateNotificationPreferenceInput!
    ): NotificationPreference!
  }
`;

export const resolvers: IResolvers = {
  User: {
    notificationPreferences: async (account, _args, ctx) => {
      // Preferences are private to the user they belong to.
      if (!ctx.auth || ctx.auth.account.id !== account.id) {
        throw forbidden();
      }
      invariant(account.userId, "account.userId is undefined");
      const overrides = await UserNotificationPreference.query().where({
        userId: account.userId,
      });
      const overrideByKey = new Map(
        overrides.map((pref) => [
          `${pref.category}:${pref.channel}`,
          pref.enabled,
        ]),
      );
      const preferences: INotificationPreference[] = [];
      for (const category of getConfigurableNotificationCategories()) {
        const meta = notificationCategoryMetadata[category];
        for (const channel of NOTIFICATION_CHANNELS) {
          // Notifications are enabled by default; only an explicit override
          // disables them.
          const enabled = overrideByKey.get(`${category}:${channel}`) ?? true;
          preferences.push({
            id: `${account.id}:${category}:${channel}`,
            category: category as INotificationPreference["category"],
            channel: channel as INotificationPreference["channel"],
            enabled,
            label: meta.label,
            description: meta.description,
          });
        }
      }
      return preferences;
    },
  },
  Mutation: {
    updateNotificationPreference: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const { category, channel, enabled } = args.input;
      const configurable = new Set<string>(
        getConfigurableNotificationCategories(),
      );
      if (!configurable.has(category)) {
        throw badUserInput("This notification category cannot be configured");
      }
      const userId = ctx.auth.user.id;
      // Notifications are enabled by default, so the table only stores opt-outs.
      // Re-enabling removes the override row instead of persisting enabled=true.
      if (enabled) {
        await UserNotificationPreference.query()
          .delete()
          .where({ userId, category, channel });
      } else {
        await UserNotificationPreference.query()
          .insert({ userId, category, channel, enabled: false })
          .onConflict(["userId", "category", "channel"])
          .merge(["enabled", "updatedAt"]);
      }
      const meta = notificationCategoryMetadata[category];
      return {
        id: `${ctx.auth.account.id}:${category}:${channel}`,
        category,
        channel,
        enabled,
        label: meta.label,
        description: meta.description,
      };
    },
  },
};
