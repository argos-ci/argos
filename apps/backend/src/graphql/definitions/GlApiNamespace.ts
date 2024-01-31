import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { getTokenGitlabClient } from "@/gitlab/index.js";
import { GraphQLError } from "graphql";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GlApiNamespace implements Node {
    id: ID!
    name: String!
    path: String!
    kind: String!
  }

  type GlApiNamespaceConnection implements Connection {
    pageInfo: PageInfo!
    edges: [GlApiNamespace!]!
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
      const projects = await (() => {
        const options = {
          pagination: "offset" as const,
          perPage: 100,
          maxPages: 1,
          page: args.page,
          showExpanded: true as const,
          ...(args.search && args.search.length > 1 && { search: args.search }),
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
        throw new GraphQLError(
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
    },
  },
};
