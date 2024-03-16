import gqlTag from "graphql-tag";

import { getTokenOctokit } from "@/github/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { unauthenticated } from "../util.js";

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
      reposPerPage: Int
    ): GhApiRepositoryConnection!
  }
`;

export const resolvers: IResolvers = {
  Query: {
    ghApiInstallationRepositories: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const reposPerPage = Math.min(args.reposPerPage || 100, 100);
      const octokit = getTokenOctokit(ctx.auth.user.accessToken);
      const apiRepositories =
        await octokit.apps.listInstallationReposForAuthenticatedUser({
          installation_id: Number(args.installationId),
          per_page: reposPerPage,
          page: args.page,
        });

      return {
        edges: apiRepositories.data.repositories,
        pageInfo: {
          hasNextPage:
            apiRepositories.data.total_count > args.page * reposPerPage,
          totalCount: apiRepositories.data.total_count,
        },
      };
    },
  },
};
