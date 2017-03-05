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
  resolveSetValidationStatus,
  validationStatusType,
} from 'server/graphql/ScreenshotDiffType'
import RepositoryType, {
  resolveList as resolveRepositoryList,
} from 'server/graphql/RepositoryType'
import OwnerType, {
  resolveList as resolveOwnerList,
} from 'server/graphql/OwnerType'

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Queries',
    fields: {
      build: {
        description: 'Get a build.',
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        type: BuildType,
        resolve: resolveBuild,
      },
      builds: {
        description: 'Get a build list.',
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
        description: 'Get the diffs for a given build.',
        args: {
          buildId: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        type: new GraphQLList(ScreenshotDiffType),
        resolve: resolveSreenshotDiffList,
      },
      repositories: {
        description: 'Get a repository list.',
        args: {
          profileName: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        type: new GraphQLList(RepositoryType),
        resolve: resolveRepositoryList,
      },
      owners: {
        description: 'Get owners list.',
        type: new GraphQLList(OwnerType),
        resolve: resolveOwnerList,
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutations',
    fields: {
      setValidationStatus: {
        type: validationStatusType,
        description: 'Change the validationStatus on a build',
        args: {
          buildId: {
            type: new GraphQLNonNull(GraphQLString),
          },
          validationStatus: {
            type: validationStatusType,
          },
        },
        resolve: resolveSetValidationStatus,
      },
    },
  }),
})
