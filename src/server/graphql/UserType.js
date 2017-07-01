import { GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql'
import RepositoryType from 'server/graphql/RepositoryType'

export function resolve(obj, args, context) {
  return context.user || null
}

const OwnerType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: GraphQLString,
    },
    relatedRepositories: {
      type: new GraphQLList(RepositoryType),
      resolve: async source => {
        const repositories = await source
          .$relatedQuery('relatedRepositories')
          .eager('[organization, user]')

        // Sorting using database doesn't work, probably an objection issue.
        // Eager is breaking it.
        return repositories.sort(
          (a, b) =>
            `${(a.organization || a.user).login}${a.name}` >
            `${(b.organization || b.user).login}${b.name}`
              ? 1
              : -1
        )
      },
    },
  },
})

export default OwnerType
