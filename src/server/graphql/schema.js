import { buildSchema } from 'graphql';

export default buildSchema(`
  type Query {
    hello: String
  }
`);
