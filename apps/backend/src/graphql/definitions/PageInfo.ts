import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type PageInfo {
    "Total number of items in the connection (can be expensive to compute on large connections, prefer \`isEmpty\` to check for emptiness)"
    totalCount: Int!
    hasNextPage: Boolean!
    "Whether the connection is empty (always false when \`after\` is greater than 0)"
    isEmpty: Boolean!
  }
`;

export const paginateResult = ({
  result,
  after,
  first,
}: {
  result: { total: number; results: any[] };
  after: number;
  first: number;
}) => {
  return {
    pageInfo: {
      totalCount: result.total,
      hasNextPage: after + first < result.total,
      isEmpty: result.total === 0,
    },
    edges: result.results,
  };
};
