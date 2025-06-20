import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum MetricsPeriod {
    LAST_24_HOURS
    LAST_3_DAYS
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
  }
`;
