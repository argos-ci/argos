import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum TimeSeriesGroupBy {
    month
    week
    day
  }
`;
