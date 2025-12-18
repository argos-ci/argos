import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  IPullRequestState,
  type IResolvers,
} from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubPullRequest implements Node & PullRequest {
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
    creator: GithubAccount
  }
`;

export const resolvers: IResolvers = {
  GithubPullRequest: {
    state: (pullRequest) => {
      if (!pullRequest.state) {
        return null;
      }
      switch (pullRequest.state) {
        case "open":
          return IPullRequestState.Open;
        case "closed":
          return IPullRequestState.Closed;
        default:
          assertNever(pullRequest.state);
      }
    },
    url: async (pullRequest, _args, ctx) => {
      const repo = await ctx.loaders.GithubRepository.load(
        pullRequest.githubRepositoryId,
      );
      invariant(repo, "Repository not found");
      const account = await ctx.loaders.GithubAccount.load(
        repo.githubAccountId,
      );
      invariant(account, "Account not found");
      return `https://github.com/${account.login}/${repo.name}/pull/${pullRequest.number}`;
    },
    creator: async (pullRequest, _args, ctx) => {
      if (!pullRequest.creatorId) {
        return null;
      }
      const creator = await ctx.loaders.GithubAccount.load(
        pullRequest.creatorId,
      );
      return creator;
    },
  },
};
