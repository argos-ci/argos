import gqlTag from "graphql-tag";

import { ICurrency, type IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum AccountSubscriptionProvider {
    github
    stripe
  }

  enum Currency {
    USD
    EUR
  }

  type AccountSubscription implements Node {
    id: ID!
    provider: AccountSubscriptionProvider!
    trialDaysRemaining: Int
    endDate: DateTime
    paymentMethodFilled: Boolean!
    status: AccountSubscriptionStatus!
    currency: Currency!
  }
`;

export const resolvers: IResolvers = {
  AccountSubscription: {
    trialDaysRemaining: (subscription) => {
      if (!subscription.trialEndDate) {
        return null;
      }
      const trialEndDate = new Date(subscription.trialEndDate).getTime();
      const now = Date.now();
      if (trialEndDate < now) {
        return null;
      }
      const remainingTime =
        new Date(subscription.trialEndDate).getTime() - Date.now();
      return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    },
    currency: (subscription) => {
      switch (subscription.currency) {
        case "usd":
          return ICurrency.Usd;
        case "eur":
          return ICurrency.Eur;
        case null:
          return ICurrency.Usd;
      }
    },
  },
};
