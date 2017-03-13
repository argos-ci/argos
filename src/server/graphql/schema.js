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
} from 'server/graphql/BuildType'
import OwnerType, {
  resolve as resolveOwner,
  resolveList as resolveOwnerList,
} from 'server/graphql/OwnerType'
import RepositoryType, {
  resolve as resolveRepository,
} from 'server/graphql/RepositoryType'
import {
  resolveSetValidationStatus,
  validationStatusType,
} from 'server/graphql/ScreenshotDiffType'

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
      repository: {
        description: 'Get a repository.',
        args: {
          ownerLogin: {
            type: new GraphQLNonNull(GraphQLString),
          },
          repositoryName: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        type: RepositoryType,
        resolve: resolveRepository,
      },
      owner: {
        description: 'Get a owner.',
        args: {
          login: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        type: OwnerType,
        resolve: resolveOwner,
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
