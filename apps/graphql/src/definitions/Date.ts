import gqlIsoDate from "graphql-iso-date";
import gqlTag from "graphql-tag";

const { gql } = gqlTag;

const { GraphQLDate, GraphQLDateTime, GraphQLTime } = gqlIsoDate;

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
