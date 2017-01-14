import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLList,
} from 'graphql/type';
import BuildType, { resolve as resolveBuild } from 'server/graphql/BuildType';
import ScreenshotDiffType, {
  resolve as resolvesSreenshotDiff,
} from 'server/graphql/ScreenshotDiffType';

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
      screenshotDiffs: {
        type: new GraphQLList(ScreenshotDiffType),
        args: {
          buildId: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        resolve: resolvesSreenshotDiff,
      },
    },
  }),
});
