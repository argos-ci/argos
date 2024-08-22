import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { GithubInstallation } from "@/database/models/GithubInstallation.js";
import { getInstallationOctokit, getTokenOctokit } from "@/github/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { forbidden, notFound, unauthenticated } from "../util.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GhApiInstallationAccount implements Node {
    id: ID!
    login: String!
    name: String
    url: String!
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
      fromAuthUser: Boolean!
      page: Int!
      reposPerPage: Int
    ): GhApiRepositoryConnection!
  }
`;

export const resolvers: IResolvers = {
  GhApiInstallationAccount: {
    url: (ghAccount) => {
      return `https://github.com/${ghAccount.login}`;
    },
  },
  Query: {
    ghApiInstallationRepositories: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const reposPerPage = Math.min(args.reposPerPage || 100, 100);
      const ghRepositories = await (async () => {
        if (args.fromAuthUser) {
          invariant(ctx.auth);
          const octokit = getTokenOctokit(ctx.auth.user.accessToken);
          return octokit.apps.listInstallationReposForAuthenticatedUser({
            installation_id: Number(args.installationId),
            per_page: reposPerPage,
            page: args.page,
          });
        }
        const installation = await GithubInstallation.query().findOne({
          githubId: args.installationId,
          deleted: false,
        });
        if (!installation) {
          throw notFound("Installation not found");
        }
        const octokit = await getInstallationOctokit(installation.id);
        if (!octokit) {
          throw forbidden("Access to installation failed");
        }
        return octokit.apps.listReposAccessibleToInstallation({
          per_page: reposPerPage,
          page: args.page,
        });
      })();

      return {
        edges: ghRepositories.data.repositories,
        pageInfo: {
          hasNextPage:
            ghRepositories.data.total_count > args.page * reposPerPage,
          totalCount: ghRepositories.data.total_count,
        },
      };
    },
  },
};
