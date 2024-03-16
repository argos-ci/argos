import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum PullRequestState {
    OPEN
    CLOSED
  }

  interface PullRequest implements Node {
    id: ID!
    number: Int!
    title: String
    state: PullRequestState
    merged: Boolean
    mergedAt: DateTime
    closedAt: DateTime
    draft: Boolean
    url: String!
    date: DateTime
  }
`;

export const resolvers: IResolvers = {
  PullRequest: {
    __resolveType: (pullRequest) => {
      switch (pullRequest.constructor.name) {
        case "GithubPullRequest":
          return "GithubPullRequest";
        default:
          throw new Error(
            `Unknown pullRequest type: ${pullRequest.constructor.name}`,
          );
      }
    },
  },
};
