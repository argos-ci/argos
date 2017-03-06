import graphqlHTTP, { formatError } from 'express-graphql'
import config from 'config'
import schema from 'server/graphql/schema'

let bestFormatError = formatError

if (config.get('env') !== 'production') {
  // Add the stack information
  bestFormatError = error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack,
  })
}

export default ({ context } = {}) => {
  return graphqlHTTP({
    schema,
    pretty: config.get('env') !== 'production',
    graphiql: config.get('env') !== 'production',
    formatError: bestFormatError,
    context,
  })
}
