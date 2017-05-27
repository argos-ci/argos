import { GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql'
import RepositoryType from 'server/graphql/RepositoryType'
import User from 'server/models/User'
import { getOwner } from 'server/graphql/utils'

const sortByLogin = (a, b) => (a.login < b.login ? -1 : 1)

export function resolve(obj, args) {
  return getOwner({ login: args.login })
}

export async function resolveList(obj, args, context) {
  const organizations = await context.user.$relatedQuery('organizations')
  const users = await User.query()
    .distinct('users.id')
    .select('users.*')
    .innerJoin('repositories', 'repositories.userId', 'users.id')
    .innerJoin('user_repository_rights', 'user_repository_rights.repositoryId', 'repositories.id')
    .where('user_repository_rights.userId', context.user.id)

  return [
    ...organizations.map(organization => ({ ...organization, type: 'organization' })),
    ...users.map(user => ({ ...user, type: 'user' })),
  ].sort(sortByLogin)
}

const OwnerType = new GraphQLObjectType({
  name: 'Owner',
  fields: () => ({
    name: { type: GraphQLString },
    login: { type: GraphQLString },
    type: { type: GraphQLString },
    repositories: {
      type: new GraphQLList(RepositoryType),
      resolve(source, args, context) {
        if (!context.user) {
          return source.$relatedQuery('repositories').where({
            private: false,
            enabled: true,
            [`repositories.${source.type}Id`]: source.id,
          })
        }

        return source
          .$relatedQuery('repositories')
          .select('repositories.*')
          .leftJoin(
            'user_repository_rights',
            'user_repository_rights.repositoryId',
            'repositories.id'
          )
          .where({ private: false, enabled: true })
          .orWhere({
            'user_repository_rights.userId': context.user.id,
            private: true,
            enabled: true,
            [`repositories.${source.type}Id`]: source.id,
          })
      },
    },
  }),
})

export default OwnerType
