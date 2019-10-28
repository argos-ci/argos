import gql from 'graphql-tag'
import { promisify } from 'util'
import Build from 'server/models/Build'
import Repository from 'server/models/Repository'
import crypto from 'crypto'
import APIError from 'server/graphql/APIError'
import generateSample from 'modules/sample/generateSample'
import { getOwner } from './Owner'

export const typeDefs = gql`
  type Repository {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    githubId: ID!
    name: String!
    enabled: Boolean!
    token: ID
    organizationId: ID!
    "Builds associated to the repository"
    builds(first: Int!, after: Int!): BuildResult!
    "Determine if the current user has write access to the repository"
    permissions: [Permission]!
    "Owner of the repository"
    owner: Owner
    sampleBuildId: ID
  }

  extend type Query {
    "Get a repository"
    repository(ownerLogin: String!, repositoryName: String!): Repository
  }

  extend type Mutation {
    "Enable or disable a repository."
    toggleRepository(enabled: Boolean!, repositoryId: String!): Repository!
  }
`

const generateRandomBytes = promisify(crypto.randomBytes)

export async function getRepository({ ownerLogin, name, user }) {
  const owner = await getOwner({ login: ownerLogin })
  if (!owner) return null

  const repository = await Repository.query()
    .where({
      [`${owner.type()}Id`]: owner.id,
      name,
    })
    .limit(1)
    .first()

  if (!repository) return null

  const hasReadPermission = await repository.$checkReadPermission(user)
  if (!hasReadPermission) return null

  return repository
}

export const resolvers = {
  Repository: {
    async token(repository, args, context) {
      const hasWritePermission = await repository.$checkWritePermission(
        context.user,
      )
      if (!hasWritePermission) return null
      return repository.token
    },
    async owner(repository) {
      return repository.$relatedOwner()
    },
    async permissions(repository, args, context) {
      const hasWritePermission = await repository.$checkWritePermission(
        context.user,
      )
      return hasWritePermission ? ['read', 'write'] : ['read']
    },
    async builds(repository, args) {
      const result = await Build.query()
        .where({ repositoryId: repository.id })
        .whereNot({ number: 0 })
        .orderBy('createdAt', 'desc')
        .range(args.after, args.after + args.first - 1)

      const hasNextPage = args.after + args.first < result.total

      return {
        pageInfo: {
          totalCount: result.total,
          hasNextPage,
          endCursor: hasNextPage ? args.after + args.first : result.total,
        },
        edges: result.results,
      }
    },
    async sampleBuildId(repository) {
      return Build.query()
        .where({
          repositoryId: repository.id,
          number: 0,
        })
        .pluck('id')
        .limit(1)
        .first()
    },
  },
  Query: {
    async repository(rootObj, args, context) {
      return getRepository({
        ownerLogin: args.ownerLogin,
        name: args.repositoryName,
        user: context.user,
      })
    },
  },
  Mutation: {
    async toggleRepository(source, args, context) {
      if (!context.user) {
        throw new APIError('Invalid user identification')
      }

      const { repositoryId, enabled } = args
      console.log(repositoryId, enabled)
      const user = await Repository.getUsers(repositoryId).findById(
        context.user.id,
      )

      if (!user) {
        throw new APIError('Invalid user authorization')
      }

      let repository = await Repository.query().patchAndFetchById(
        repositoryId,
        { enabled },
      )

      if (!repository) {
        throw new APIError('Repository not found')
      }

      // We can skip further work when disabling a repository
      if (!enabled) {
        return repository
      }

      const sample = await Build.query()
        .where({
          repositoryId: repository.id,
          number: 0,
        })
        .pluck('id')
        .limit(1)
        .first()

      // No need to generate a sample if we find one.
      if (!sample) {
        await generateSample(repositoryId)
      }

      if (!repository.token) {
        const token = await generateRandomBytes(20)
        repository = await Repository.query().patchAndFetchById(repositoryId, {
          token: token.toString('hex'),
        })
      }

      return repository
    },
  },
}
