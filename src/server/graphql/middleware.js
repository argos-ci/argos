import graphqlHTTP from 'express-graphql'
import schema from 'server/graphql/schema'
import crashReporter from 'modules/crashReporter/common'

export default ({ context } = {}) =>
  graphqlHTTP(req => ({
    schema,
    pretty: process.env.NODE_ENV !== 'production',
    graphiql: process.env.NODE_ENV !== 'production',
    formatError(error) {
      // We do want to report errors that are intentionally inside the resolvers.
      if (!error.originalError || error.originalError.name !== 'APIError') {
        if (error.path || error.name !== 'GraphQLError') {
          crashReporter().captureException(error, {
            ...crashReporter().parsers.parseRequest(req),
            tags: { graphql: 'exec_error' },
            extra: {
              source: error.source && error.source.body,
              positions: error.positions,
              path: error.path,
            },
          })
        } else {
          crashReporter().captureMessage(`GraphQLWrongQuery: ${error.message}`, {
            ...crashReporter().parsers.parseRequest(req),
            tags: { graphql: 'wrong_query' },
            extra: {
              source: error.source && error.source.body,
              positions: error.positions,
            },
          })
        }
      }

      return {
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? null : error.stack.split('\n'),
      }
    },
    context,
  }))
