import gqlTag from "graphql-tag";

// eslint-disable-next-line import/no-named-as-default-member
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
`;
