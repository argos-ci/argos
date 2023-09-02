import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { getTokenGitlabClient } from "@argos-ci/gitlab";

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
      accessToken: String!
      page: Int!
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
        };
        if (args.userId) {
          return client.Users.allProjects(args.userId, options);
        }
        if (args.groupId) {
          return client.Groups.allProjects(args.groupId, options);
        }
        throw new Error("Either userId or groupId must be provided");
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
