import gqlTag from "graphql-tag";

import { Account, Purchase } from "@argos-ci/database/models";

import { getOwner } from "./Owner.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum PurchaseSource {
    github
    stripe
  }

  type Purchase implements Node {
    id: ID!
    source: PurchaseSource
    owner: Owner!
  }
`;

export const resolvers = {
  Purchase: {
    owner: async (purchase: Purchase) => {
      const account = (await Account.query().findById(
        purchase.accountId
      )) as Account;
      const accountLogin = await account.getLogin();
      return getOwner({ login: accountLogin });
    },
  },
};
