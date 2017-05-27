/**
 * Inspired by https://github.com/ekubyshin/graphql-pagination.
 */

import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
  GraphQLBoolean,
  GraphQLNonNull,
} from 'graphql/type'

function pageInfoTypeFactory(name) {
  return new GraphQLObjectType({
    name: `${name}PageInfo`,
    fields: {
      totalCount: {
        type: GraphQLInt,
      },
      endCursor: {
        type: GraphQLInt,
      },
      hasNextPage: {
        type: GraphQLBoolean,
      },
    },
  })
}

function paginationTypeFactory(options) {
  const { type } = options

  const name = type.name

  return new GraphQLObjectType({
    name: `${name}Pagination`,
    fields: {
      pageInfo: {
        type: new GraphQLNonNull(pageInfoTypeFactory(name)),
      },
      edges: {
        type: new GraphQLList(type),
      },
    },
  })
}

export default paginationTypeFactory
