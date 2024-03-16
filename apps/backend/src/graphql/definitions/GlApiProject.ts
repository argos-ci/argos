import gqlTag from "graphql-tag";

import { getTokenGitlabClient } from "@/gitlab/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { badUserInput } from "../util.js";

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
      userId: ID
      groupId: ID
      allProjects: Boolean!
      accessToken: String!
      page: Int!
      search: String
    ): GlApiProjectConnection!
  }
`;

export const resolvers: IResolvers = {
  Query: {
    glApiProjects: async (_root, args) => {
      const client = getTokenGitlabClient(args.accessToken);
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
