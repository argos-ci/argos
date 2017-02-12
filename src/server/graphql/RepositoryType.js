import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
} from 'graphql'
import Repository from 'server/models/Repository'
import GraphQLDateType from 'graphql-custom-datetype'

export const resolve = (source, args) => {
  return Repository
    .query()
    .where({
      id: args.id,
    })
    .then(([organization]) => {
      return organization
    })
}

export const resolveList = (source, args) => {
  return Repository
    .query()
    .select('repositories.*')
    .innerJoin('organizations', 'organizations.id', 'repositories.organizationId')
    .where({
      'organizations.name': args.profileName,
    })
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
      type: GraphQLDateType,
    },
    updatedAt: {
      type: GraphQLDateType,
    },
  },
})

export default RepositoryType
