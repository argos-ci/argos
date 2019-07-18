import { ApolloServer } from 'apollo-server-express'
import crashReporter from 'modules/crashReporter/common'
import { schema } from './schema'

export const apolloServer = new ApolloServer({
  schema,
  context: ({ req }) => ({ user: req.user || null }),
  formatError(error) {
    const reporter = crashReporter()
    // We do want to report errors that are intentionally inside the resolvers.
    if (!error.originalError || error.originalError.name !== 'APIError') {
      if (error.path || error.name !== 'GraphQLError') {
        reporter.captureException(error, {
          tags: { graphql: 'exec_error' },
          extra: {
            source: error.source && error.source.body,
            positions: error.positions,
            path: error.path,
          },
        })
      } else {
        reporter.captureMessage(`GraphQLWrongQuery: ${error.message}`, {
          tags: { graphql: 'wrong_query' },
          extra: {
            source: error.source && error.source.body,
            positions: error.positions,
          },
        })
      }
    }

    return { message: error.message }
  },
})
