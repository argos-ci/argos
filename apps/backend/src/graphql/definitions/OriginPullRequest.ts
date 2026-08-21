import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getOriginPullRequestUrl } from "@/origin/url";

import {
  IPullRequestState,
  type IResolvers,
} from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type OriginPullRequest implements Node & PullRequest {
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
  OriginPullRequest: {
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
      const repository = await ctx.loaders.OriginRepository.load(
        pullRequest.originRepositoryId,
      );
      invariant(repository, "Repository not found");
      return getOriginPullRequestUrl({
        ownerSlug: repository.ownerSlug,
        name: repository.name,
        number: pullRequest.number,
      });
    },
  },
};
