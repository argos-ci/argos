import graphqlHTTP, { formatError } from 'express-graphql';
import config from 'config';
import schema from 'server/graphql/schema';

let bestFormatError = formatError;

if (config.get('env') !== 'production') {
  // Add the stack information
  bestFormatError = error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack,
  });
}

export default () => {
  return graphqlHTTP({
    schema,
    rootValue: {
      hello: () => 'Hello world!',
    },
    pretty: config.get('env') !== 'production',
    graphiql: config.get('env') !== 'production',
    formatError: bestFormatError,
  });
};
