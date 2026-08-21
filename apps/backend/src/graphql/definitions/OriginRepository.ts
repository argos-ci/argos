import gqlTag from "graphql-tag";

import { getOriginRepositoryUrl } from "@/origin/url";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type OriginRepository implements Node & Repository {
    id: ID!
    defaultBranch: String!
    private: Boolean!
    fullName: String!
    url: String!
    name: String!
    ownerSlug: String!
  }
`;

export const resolvers: IResolvers = {
  OriginRepository: {
    url: (repository) => getOriginRepositoryUrl(repository),
  },
};
