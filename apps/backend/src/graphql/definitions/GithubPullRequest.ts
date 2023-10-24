import gqlTag from "graphql-tag";
import {
  IPullRequestState,
  type IResolvers,
} from "../__generated__/resolver-types.js";
import { invariant } from "@/util/invariant.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubPullRequest implements Node & PullRequest {
    id: ID!
    number: Int!
    title: String
    state: PullRequestState
    merged: Boolean
    draft: Boolean
    url: String!
  }
`;

export const resolvers: IResolvers = {
  GithubPullRequest: {
    state: (pullRequest) => {
      switch (pullRequest.state) {
        case "open":
          return IPullRequestState.Open;
        case "closed": {
          return IPullRequestState.Closed;
        }
        default:
          throw new Error(`Unknown state: ${pullRequest.state}`);
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
  },
};
