/* eslint-disable no-console */
import graphqlHTTP from 'express-graphql'
import config from 'config'
import schema from 'server/graphql/schema'
import PrettyError from 'pretty-error'
import crashReporter from 'modules/crashReporter/crashReporter'

const pe = new PrettyError()
pe.skipNodeFiles()
pe.skipPackage('express', 'graphql')

export default ({ context } = {}) => graphqlHTTP(req => ({
  schema,
  pretty: config.get('env') !== 'production',
  graphiql: config.get('env') !== 'production',
  formatError(error) {
    if (error.path || error.name !== 'GraphQLError') {
      console.error(pe.render(error))
      crashReporter.captureException(
        error,
        {
          ...crashReporter.parsers.parseRequest(req),
          tags: { graphql: 'exec_error' },
          extra: {
            source: error.source && error.source.body,
            positions: error.positions,
            path: error.path,
          },
        },
      )
    } else {
      console.error(pe.render(error.message))
      crashReporter.captureMessage(
        `GraphQLWrongQuery: ${error.message}`,
        {
          ...crashReporter.parsers.parseRequest(req),
          tags: { graphql: 'wrong_query' },
          extra: {
            source: error.source && error.source.body,
            positions: error.positions,
          },
        },
      )
    }
    return {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack.split('\n') : null,
    }
  },
  context,
}))
