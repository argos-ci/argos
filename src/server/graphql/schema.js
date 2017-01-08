import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLInt,
} from 'graphql/type';
import BuildType, { resolve as resolveBuild } from './BuildType';

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      build: {
        type: BuildType,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        resolve: resolveBuild,
      },
    },
  }),
});
