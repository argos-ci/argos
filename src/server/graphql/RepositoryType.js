import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLInt,
} from 'graphql'
import crypto from 'crypto'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'
import paginationTypeFactory from 'modules/graphQL/paginationTypeFactory'
import { getOwner } from 'server/graphql/utils'
import BuildType, {
  resolveList as resolveBuildList,
  resolveSample as resolveBuildSample,
} from 'server/graphql/BuildType'
import OwnerType from 'server/graphql/OwnerType'
import Repository from 'server/models/Repository'
import generateSample from 'modules/sample/generateSample'

function toPromise(wrapped) {
  return new Promise((resolve, reject) => {
    wrapped((err, data) => {
      if (err) {
        reject(err)
        return
      }

      resolve(data)
    })
  })
}

export async function resolve(source, args, context) {
  const owner = await getOwner({ login: args.ownerLogin })

  if (!owner) {
    return null
  }

  const repository = await Repository.query()
    .where({
      [`${owner.type}Id`]: owner.id,
      name: args.repositoryName,
    })
    .limit(1)
    .first()

  if (await Repository.isAccessible(repository, context.user)) {
    return repository
  }

  return null
}

export async function toggleRepository(source, args, context) {
  if (!context.user) {
    throw new Error('Invalid user identification')
  }

  const { repositoryId, enabled } = args
  const user = await Repository.getUsers(repositoryId).findById(context.user.id)

  if (!user) {
    throw new Error('Invalid user authorization')
  }

  let repository = await Repository.query().patchAndFetchById(repositoryId, { enabled })

  // We can skip further work when disabling a repository
  if (!enabled) {
    return repository
  }

  const sample = await resolveBuildSample(repository)

  // No need to generate a sample if we find one.
  if (!sample) {
    generateSample(repositoryId)
  }

  if (!repository.token) {
    const token = await toPromise(callback => crypto.randomBytes(20, callback))
    repository = await Repository.query().patchAndFetchById(repositoryId, {
      token: token.toString('hex'),
    })
  }

  return repository
}

const RepositoryType = new GraphQLObjectType({
  name: 'Repository',
  fields: () => ({
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
      resolve: async (repository, args, context) => {
        if (!await repository.authorization(context.user)) {
          return null
        }

        return repository.token
      },
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
    authorization: {
      description: 'Determine if the current user has write access to the repository',
      type: GraphQLBoolean,
      resolve: (repository, args, context) => repository.authorization(context.user),
    },
    owner: {
      description: 'Owner of repository.',
      type: OwnerType,
      resolve: source => source.getOwner(),
    },
    sampleBuildId: {
      description: 'build id of the sample',
      type: GraphQLString,
      resolve: resolveBuildSample,
    },
  }),
})

export default RepositoryType
