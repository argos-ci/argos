import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql/type'
import BuildType, {
  resolve as resolveBuild,
  resolveList as resolveBuildList,
} from 'server/graphql/BuildType'
import ScreenshotDiffType, {
  resolveList as resolveSreenshotDiffList,
} from 'server/graphql/ScreenshotDiffType'

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
      builds: {
        type: new GraphQLList(BuildType),
        args: {
          profileName: {
            type: new GraphQLNonNull(GraphQLString),
          },
          repositoryName: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        resolve: resolveBuildList,
      },
      screenshotDiffs: {
        type: new GraphQLList(ScreenshotDiffType),
        args: {
          buildId: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        resolve: resolveSreenshotDiffList,
      },
    },
  }),
})
