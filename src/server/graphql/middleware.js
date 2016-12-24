import graphqlHTTP from 'express-graphql';
import config from 'config';
import schema from './schema';

export default () => {
  return graphqlHTTP({
    schema,
    rootValue: {
      hello: () => 'Hello world!',
    },
    pretty: config.get('env') !== 'production',
    graphiql: config.get('env') !== 'production',
  });
};
