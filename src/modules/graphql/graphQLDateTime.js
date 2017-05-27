/**
 * Inspired by:
 * - https://github.com/graphql/graphql-js/blob/master/src/type/scalars.js
 * - https://github.com/soundtrackyourbrand/graphql-custom-datetype/blob/master/datetype.js
 * - https://github.com/stylesuxx/graphql-custom-types/blob/master/src/scalars.js
 */

import { GraphQLScalarType } from 'graphql'
import { GraphQLError } from 'graphql/error'
import { Kind } from 'graphql/language'

function coerceDateTime(value) {
  if (!(value instanceof Date)) {
    throw new TypeError('DateTime can only represent instance of Date.')
  }

  if (isNaN(value.getTime())) {
    throw new TypeError('DateTime only accept valid dates.')
  }

  return value.toJSON()
}

const graphQLDateType = new GraphQLScalarType({
  name: 'DateTime',
  description: 'The DateTime scalar type represents date time strings complying to ISO-8601.',
  serialize: coerceDateTime,
  parseValue: coerceDateTime,
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Query error: Can only parse strings to dates but got a: ${ast.kind}`,
        [ast]
      )
    }

    const result = new Date(ast.value)

    if (isNaN(result.getTime())) {
      throw new GraphQLError('Query error: Invalid date', [ast])
    }

    if (ast.value !== result.toJSON()) {
      throw new GraphQLError(
        'Query error: Invalid date format, only accepts: YYYY-MM-DDTHH:MM:SS.SSSZ',
        [ast]
      )
    }

    return result
  },
})

export default graphQLDateType
