import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum DeploymentStatus {
    pending
    ready
    error
  }

  enum DeploymentEnvironment {
    preview
    production
  }

  type Deployment implements Node {
    id: ID!
    createdAt: DateTime!
    status: DeploymentStatus!
    environment: DeploymentEnvironment!
    branch: String
    commitSha: String
    url: String
  }

  type DeploymentConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Deployment!]!
  }
`;

export const resolvers: IResolvers = {};
