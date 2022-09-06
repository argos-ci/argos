import { gql } from "graphql-tag";

export const typeDefs = gql`
  type PageInfo {
    totalCount: Int!
    endCursor: Int!
    hasNextPage: Boolean!
  }
`;

export function paginateResult({ result, offset, limit }) {
  const hasNextPage = offset + limit < result.total;
  return {
    pageInfo: {
      totalCount: result.total,
      hasNextPage,
      endCursor: hasNextPage ? offset + limit : result.total,
    },
    edges: result.results,
  };
}
