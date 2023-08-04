import gqlTag from "graphql-tag";

import { getTokenOctokit } from "@argos-ci/github";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { unauthenticated } from "../util.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GhApiInstallationAccount implements Node {
    id: ID!
    login: String!
    name: String
  }

  type GhApiInstallation implements Node {
    id: ID!
    account: GhApiInstallationAccount!
  }

  type GhApiInstallationConnection implements Connection {
    pageInfo: PageInfo!
    edges: [GhApiInstallation!]!
  }

  extend type Query {
    ghApiInstallationRepositories(
      installationId: ID!
      page: Int!
    ): GhApiRepositoryConnection!
  }
`;

export const resolvers: IResolvers = {
  Query: {
    ghApiInstallationRepositories: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const octokit = getTokenOctokit(ctx.auth.user.accessToken);
      const apiRepositories =
        await octokit.apps.listInstallationReposForAuthenticatedUser({
          installation_id: Number(args.installationId),
          per_page: 100,
          page: args.page,
        });

      return {
        edges: apiRepositories.data.repositories,
        pageInfo: {
          hasNextPage: apiRepositories.data.total_count > args.page * 100,
          totalCount: apiRepositories.data.total_count,
        },
      };
    },
  },
};
