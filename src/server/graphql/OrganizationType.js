import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
} from 'graphql'
import Organization from 'server/models/Organization'
import GraphQLDateType from 'graphql-custom-datetype'

export const resolve = (source, args) => {
  return Organization
    .query()
    .where({
      id: args.id,
    })
    .then(([organization]) => {
      return organization
    })
}

export const resolveList = () => {
  return Organization
    .query()
}

const OrganizationType = new GraphQLObjectType({
  name: 'Organization',
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
    createdAt: {
      type: GraphQLDateType,
    },
    updatedAt: {
      type: GraphQLDateType,
    },
  },
})

export default OrganizationType
