import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  IBuildReviewState,
  type IResolvers,
} from "../__generated__/resolver-types.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum BuildReviewState {
    APPROVED
    REJECTED
    PENDING
  }

  type BuildReview implements Node {
    id: ID!
    date: DateTime!
    user: User
    state: BuildReviewState!
  }
`;

export const resolvers: IResolvers = {
  BuildReview: {
    date: (review) => {
      return new Date(review.createdAt);
    },
    state: (review) => {
      switch (review.state) {
        case "approved":
          return IBuildReviewState.Approved;
        case "rejected":
          return IBuildReviewState.Rejected;
        case "pending":
          return IBuildReviewState.Pending;
        default:
          assertNever(review.state);
      }
    },
    user: async (review, _, ctx) => {
      if (!review.userId) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: review.userId,
      });
      invariant(account, "Account not found");
      return account;
    },
  },
};
