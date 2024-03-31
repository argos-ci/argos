import gqlTag from "graphql-tag";

import { getGitlabClientFromAccount } from "@/gitlab/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { getAdminAccount } from "../services/account.js";
import { badUserInput, notFound, unauthenticated } from "../util.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GlApiProject implements Node {
    id: ID!
    name: String!
    last_activity_at: String!
    namespace: GlApiNamespace!
  }

  type GlApiProjectConnection implements Connection {
    pageInfo: PageInfo!
    edges: [GlApiProject!]!
  }

  extend type Query {
    glApiProjects(
      accountId: ID!
      userId: ID
      groupId: ID
      allProjects: Boolean!
      page: Int!
      search: String
    ): GlApiProjectConnection!
  }
`;

export const resolvers: IResolvers = {
  Query: {
    glApiProjects: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const account = await getAdminAccount({
        id: args.accountId,
        user: ctx.auth.user,
      });
      if (!account.gitlabAccessToken) {
        throw notFound("Account has no GitLab access token.");
      }
      const client = await getGitlabClientFromAccount(account);
      if (!client) {
        throw notFound("Invalid GitLab access token.");
      }
      try {
        const projects = await (() => {
          const options = {
            pagination: "offset" as const,
            perPage: 100,
            maxPages: 1,
            page: args.page,
            showExpanded: true as const,
            ...(args.search &&
              args.search.length > 1 && { search: args.search }),
          };
          if (args.userId) {
            return client.Users.allProjects(args.userId, options);
          }
          if (args.groupId) {
            return client.Groups.allProjects(args.groupId, options);
          }
          if (args.allProjects) {
            return client.Projects.all({ ...options, membership: true });
          }
          throw badUserInput(
            "Either `userId`, `groupId` or `allProjects` option must be provided.",
          );
        })();
        return {
          edges: projects.data,
          pageInfo: {
            hasNextPage: projects.paginationInfo.total > args.page * 100,
            totalCount: projects.paginationInfo.total,
          },
        };
      } catch (error) {
        // Sometimes GitLab API returns 404 when there are no projects
        if (error instanceof Error && error.message === "Not Found") {
          return {
            edges: [],
            pageInfo: {
              hasNextPage: false,
              totalCount: 0,
            },
          };
        }
        throw error;
      }
    },
  },
};
