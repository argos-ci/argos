import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLInt,
} from 'graphql'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'
import paginationTypeFactory from 'modules/graphQL/paginationTypeFactory'
import { getOwner, isRepositoryAccessible } from 'server/graphql/utils'
import BuildType, { resolveList as resolveBuildList } from 'server/graphql/BuildType'
import Repository from 'server/models/Repository'

export async function resolve(source, args, context) {
  const owner = await getOwner({ login: args.ownerLogin })

  if (!owner) {
    return null
  }

  const [repository] = await Repository.query().where({
    [`${owner.type}Id`]: owner.id,
    name: args.repositoryName,
  })

  if (await isRepositoryAccessible(repository, context)) {
    return repository
  }

  return null
}

const RepositoryType = new GraphQLObjectType({
  name: 'Repository',
  fields: {
    id: {
      type: GraphQLString,
    },
    githubId: {
      type: GraphQLString,
    },
    name: {
      type: GraphQLString,
    },
    login: {
      type: GraphQLString,
    },
    enabled: {
      type: GraphQLBoolean,
    },
    token: {
      type: GraphQLString,
    },
    organizationId: {
      type: GraphQLString,
    },
    createdAt: {
      type: graphQLDateTime,
    },
    updatedAt: {
      type: graphQLDateTime,
    },
    builds: {
      description: 'Get repository builds.',
      args: {
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
  },
})

export default RepositoryType
