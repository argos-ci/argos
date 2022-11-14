import gqlTag from "graphql-tag";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type PageInfo {
    totalCount: Int!
    endCursor: Int!
    hasNextPage: Boolean!
  }
`;

export const paginateResult = ({
  result,
  offset,
  limit,
}: {
  result: { total: number; results: any[] };
  offset: number;
  limit: number;
}) => {
  const hasNextPage = offset + limit < result.total;
  return {
    pageInfo: {
      totalCount: result.total,
      hasNextPage,
      endCursor: hasNextPage ? offset + limit : result.total,
    },
    edges: result.results,
  };
};
