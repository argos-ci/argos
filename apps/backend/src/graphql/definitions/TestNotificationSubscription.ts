import gqlTag from "graphql-tag";

import {
  subscribeUserToTest,
  unsubscribeUserFromTest,
} from "@/database/services/test-notification-subscription";

import type { IResolvers } from "../__generated__/resolver-types";
import { getTestForUser } from "../testAccess";
import { unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  input SubscribeToTestInput {
    testId: ID!
  }

  input UnsubscribeFromTestInput {
    testId: ID!
  }

  extend type Mutation {
    "Subscribe the current user to a test's notifications"
    subscribeToTest(input: SubscribeToTestInput!): Test!
    "Unsubscribe the current user from a test's notifications"
    unsubscribeFromTest(input: UnsubscribeFromTestInput!): Test!
  }
`;

export const resolvers: IResolvers = {
  Mutation: {
    subscribeToTest: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const test = await getTestForUser({
        id: args.input.testId,
        user: auth.user,
        permission: "view",
        message: "You cannot access this test",
      });
      await subscribeUserToTest({ testId: test.id, userId: auth.user.id });
      return test;
    },
    unsubscribeFromTest: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const test = await getTestForUser({
        id: args.input.testId,
        user: auth.user,
        permission: "view",
        message: "You cannot access this test",
      });
      await unsubscribeUserFromTest({ testId: test.id, userId: auth.user.id });
      return test;
    },
  },
};
