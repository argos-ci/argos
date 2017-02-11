import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql/type'
import paginationTypeFactory from 'modules/graphQL/paginationTypeFactory'
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
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        type: BuildType,
        resolve: resolveBuild,
      },
      builds: {
        args: {
          profileName: {
            type: new GraphQLNonNull(GraphQLString),
          },
          repositoryName: {
            type: new GraphQLNonNull(GraphQLString),
          },
          first: { // Number to display
            type: new GraphQLNonNull(GraphQLInt),
          },
          after: { // Cursor
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        type: paginationTypeFactory({
          type: BuildType,
        }),
        resolve: resolveBuildList,
      },
      screenshotDiffs: {
        args: {
          buildId: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        type: new GraphQLList(ScreenshotDiffType),
        resolve: resolveSreenshotDiffList,
      },
    },
  }),
})
