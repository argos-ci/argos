import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type PageInfo {
    totalCount: Int!
    hasNextPage: Boolean!
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
    },
    edges: result.results,
  };
};
