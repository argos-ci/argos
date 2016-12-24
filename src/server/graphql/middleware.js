import graphqlHTTP from 'express-graphql';
import schema from './schema';

export default () => {
  return graphqlHTTP({
    schema,
    rootValue: {
      hello: () => 'Hello world!',
    },
    pretty: true,
    graphiql: true,
  });
};
