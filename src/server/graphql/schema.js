import {
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLInputObjectType,
} from 'graphql/type'
import BuildType, { resolve as resolveBuild } from 'server/graphql/BuildType'
import OwnerType, {
  resolve as resolveOwner,
  resolveList as resolveOwnerList,
} from 'server/graphql/OwnerType'
import RepositoryType, {
  resolve as resolveRepository,
  toggleRepository,
} from 'server/graphql/RepositoryType'
import { setValidationStatus, validationStatusType } from 'server/graphql/ScreenshotDiffType'
import UserType, { resolve as resolveUser } from 'server/graphql/UserType'
import resolveUsurpUser from 'server/graphql/resolveUsurpUser'

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
      user: {
        description: 'Get current user.',
        type: UserType,
        resolve: resolveUser,
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
        resolve: setValidationStatus,
      },
      toggleRepository: {
        type: RepositoryType,
        description: 'Enable or disable a repository.',
        args: {
          enabled: {
            type: GraphQLBoolean,
          },
          repositoryId: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        resolve: toggleRepository,
      },
      usurpUser: {
        type: UserType,
        description: 'Can be used to usur a user',
        args: {
          input: {
            type: new GraphQLInputObjectType({
              name: 'UsurpUserInputType',
              fields: {
                email: {
                  type: new GraphQLNonNull(GraphQLString),
                },
              },
            }),
          },
        },
        resolve: resolveUsurpUser,
      },
    },
  }),
})
