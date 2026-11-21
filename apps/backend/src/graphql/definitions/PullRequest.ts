import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types";

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
    repository: Repository!
  }

  "A pull request of a stack, with the latest build of the suite on it"
  type PullRequestStackItem {
    pullRequest: PullRequest!
    "Latest build of the same suite in the project for this pull request"
    build: Build
  }

  "Pull requests merging into each other's branches"
  type PullRequestStack {
    "From the top of the stack down to the pull request merging into the base branch"
    items: [PullRequestStackItem!]!
    "The branch the bottom pull request merges into"
    baseBranch: String
  }
`;

export const resolvers: IResolvers = {
  PullRequest: {
    __resolveType: (pullRequest) => {
      switch (pullRequest.constructor.name) {
        case "GithubPullRequest":
          return "GithubPullRequest";
        case "OriginPullRequest":
          return "OriginPullRequest";
        default:
          throw new Error(
            `Unknown pullRequest type: ${pullRequest.constructor.name}`,
          );
      }
    },
  },
};
