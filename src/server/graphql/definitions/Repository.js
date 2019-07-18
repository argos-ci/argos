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
    authorization: Boolean!
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

export const resolvers = {
  Repository: {
    async token(repository, args, context) {
      const authorized = await repository.authorization(context.user)
      if (!authorized) return null

      return repository.token
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
    async authorization(repository, args, context) {
      return repository.authorization(context.user)
    },
    async owner(repository) {
      return repository.getOwner()
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
      const owner = await getOwner({ login: args.ownerLogin })
      if (!owner) return null

      const repository = await Repository.query()
        .where({
          [`${owner.type}Id`]: owner.id,
          name: args.repositoryName,
        })
        .limit(1)
        .first()

      const accessible = await Repository.isAccessible(repository, context.user)
      if (!accessible) return null

      return repository
    },
  },
  Mutation: {
    async toggleRepository(source, args, context) {
      if (!context.user) {
        throw new APIError('Invalid user identification')
      }

      const { repositoryId, enabled } = args
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
