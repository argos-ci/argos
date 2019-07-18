import gql from 'graphql-tag'
import User from 'server/models/User'
import Organization from 'server/models/Organization'
import { OWNER_TYPES } from 'server/constants'

export const typeDefs = gql`
  enum OwnerType {
    organization
    user
  }

  type Owner {
    name: String
    login: String!
    type: OwnerType!
    repositories: [Repository!]!
  }

  extend type Query {
    "Get owners"
    owners: [Owner!]!
    "Get owner"
    owner(login: String!): Owner
  }
`

const sortByLogin = (a, b) => (a.login < b.login ? -1 : 1)

export async function getOwner({ login }) {
  let owner = await Organization.query()
    .where({ login })
    .limit(1)
    .first()

  if (owner) {
    owner.type = OWNER_TYPES.organization
    return owner
  }

  owner = await User.query()
    .where({ login })
    .limit(1)
    .first()

  if (owner) {
    owner.type = OWNER_TYPES.user
    return owner
  }

  return null
}

export const resolvers = {
  Owner: {
    async repositories(owner, args, context) {
      if (!context.user) {
        return owner.$relatedQuery('repositories').where({
          private: false,
          enabled: true,
          [`repositories.${owner.type}Id`]: owner.id,
        })
      }

      return owner
        .$relatedQuery('repositories')
        .select('repositories.*')
        .leftJoin(
          'user_repository_rights',
          'user_repository_rights.repositoryId',
          'repositories.id',
        )
        .where({ private: false, enabled: true })
        .orWhere({
          'user_repository_rights.userId': context.user.id,
          private: true,
          enabled: true,
          [`repositories.${owner.type}Id`]: owner.id,
        })
    },
  },
  Query: {
    async owners(rootObj, args, context) {
      const organizations = await context.user.$relatedQuery('organizations')
      const users = await User.query()
        .distinct('users.id')
        .select('users.*')
        .innerJoin('repositories', 'repositories.userId', 'users.id')
        .innerJoin(
          'user_repository_rights',
          'user_repository_rights.repositoryId',
          'repositories.id',
        )
        .where('user_repository_rights.userId', context.user.id)

      return [
        ...organizations.map(organization => ({
          ...organization,
          type: OWNER_TYPES.organization,
        })),
        ...users.map(user => ({ ...user, type: OWNER_TYPES.user })),
      ].sort(sortByLogin)
    },
    async owner(rootObject, args) {
      return getOwner({ login: args.login })
    },
  },
}
