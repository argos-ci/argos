import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
} from 'graphql'
import GraphQLDateTime from 'modules/graphQL/GraphQLDateTime'
import Organization from 'server/models/Organization'

export const resolve = (source, args) => {
  return Organization
    .query()
    .findById(args.id)
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
      type: GraphQLDateTime,
    },
    updatedAt: {
      type: GraphQLDateTime,
    },
  },
})

export default OrganizationType
