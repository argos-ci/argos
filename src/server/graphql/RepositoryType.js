import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'

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
      type: GraphQLString,
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
      type: graphQLDateTime,
    },
    updatedAt: {
      type: graphQLDateTime,
    },
  },
})

export default RepositoryType
