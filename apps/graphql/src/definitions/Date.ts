import gqlIsoDate from "graphql-iso-date";
import gqlTag from "graphql-tag";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

// eslint-disable-next-line import/no-named-as-default-member
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
