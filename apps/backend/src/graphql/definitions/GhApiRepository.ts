import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GhApiRepository implements Node {
    id: ID!
    name: String!
    updated_at: String!
    owner_login: String!
  }

  type GhApiRepositoryConnection implements Connection {
    pageInfo: PageInfo!
    edges: [GhApiRepository!]!
  }
`;

export const resolvers: IResolvers = {
  GhApiRepository: {
    owner_login: (parent) => {
      return parent.owner.login;
    },
  },
};
