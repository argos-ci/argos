import { GraphQLDate, GraphQLDateTime, GraphQLTime } from "graphql-scalars";
import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  scalar Date
  scalar DateTime
  scalar Time
`;

export const resolvers = {
  Date: GraphQLDate,
  DateTime: GraphQLDateTime,
  Time: GraphQLTime,
};
