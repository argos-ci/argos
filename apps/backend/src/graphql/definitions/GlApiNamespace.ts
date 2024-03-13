import gqlTag from "graphql-tag";

import { IResolvers } from "../__generated__/resolver-types";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GlApiNamespace implements Node {
    id: ID!
    name: String!
    path: String!
    kind: String!
    isProjectToken: Boolean!
  }

  type GlApiNamespaceConnection implements Connection {
    pageInfo: PageInfo!
    edges: [GlApiNamespace!]!
  }
`;

export const resolvers: IResolvers = {
  GlApiNamespace: {
    isProjectToken: (namespace) => {
      return (
        namespace.kind === "user" && /^project_(.*)_bot_/.test(namespace.path)
      );
    },
  },
};
