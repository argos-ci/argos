import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
} from 'graphql'
import GraphQLDateTime from 'modules/graphQL/GraphQLDateTime'

export function resolveList(source, args, context) {
  return context.user.$relatedQuery('repositories')
    .select('repositories.*')
    .leftJoin('organizations', 'organizations.id', 'repositories.organizationId')
    .leftJoin('users', 'users.id', 'repositories.userId')
    .where('organizations.name', args.profileName)
    .orWhere('users.login', args.profileName)
}

const RepositoryType = new GraphQLObjectType({
  name: 'Repository',
  fields: {
    id: {
      type: GraphQLID,
    },
    githubId: {
      type: GraphQLString,
    },
    name: {
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
      type: GraphQLDateTime,
    },
    updatedAt: {
      type: GraphQLDateTime,
    },
  },
})

export default RepositoryType
