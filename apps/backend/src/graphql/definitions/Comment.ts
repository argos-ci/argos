import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  A comment posted on a build.
  """
  type Comment implements Node {
    id: ID!
    "Date the comment was posted"
    date: DateTime!
    "Rich-text JSON content of the comment"
    content: JSONObject!
    "Author of the comment"
    user: User
  }
`;

export const resolvers: IResolvers = {
  Comment: {
    date: (comment) => {
      return new Date(comment.createdAt);
    },
    content: (comment) => {
      return comment.content as Record<string, unknown>;
    },
    user: async (comment, _, ctx) => {
      if (!comment.userId) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: comment.userId,
      });
      invariant(account, "Account not found");
      return account;
    },
  },
};
