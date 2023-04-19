import gqlTag from "graphql-tag";

// eslint-disable-next-line import/no-named-as-default-member
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

export const resolvers = {
  GhApiRepository: {
    owner_login: (parent: { owner: { login: string } }) => {
      return parent.owner.login;
    },
  },
};
