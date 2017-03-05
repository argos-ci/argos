import {
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import User from 'server/models/User'

export async function resolveList(obj, args, context) {
  const organizations = await context.user.$relatedQuery('organizations')
  const users = await User
    .query()
    .distinct('users.id')
    .select('users.*')
    .innerJoin('repositories', 'repositories.userId', 'users.id')
    .innerJoin('user_repository_rights', 'user_repository_rights.repositoryId', 'repositories.id')
    .where('user_repository_rights.userId', context.user.id)

  return [
    ...organizations.map(organization => ({
      name: organization.getUrlIdentifier(),
      type: 'organization',
    })),
    ...users.map(user => ({
      name: user.getUrlIdentifier(),
      type: 'user',
    })),
  ]
}

const OwnerType = new GraphQLObjectType({
  name: 'Owner',
  fields: {
    name: { type: GraphQLString },
    type: { type: GraphQLString },
  },
})

export default OwnerType
