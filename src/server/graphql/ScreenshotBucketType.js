import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
} from 'graphql'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'
import ScreenshotBucket from 'server/models/ScreenshotBucket'

export function resolve(source, args) {
  return ScreenshotBucket
    .query()
    .findById(args.id)
}

const ScreenshotBucketType = new GraphQLObjectType({
  name: 'ScreenshotBucket',
  fields: {
    id: {
      type: GraphQLID,
    },
    name: {
      type: GraphQLString,
    },
    commit: {
      type: GraphQLString,
    },
    branch: {
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

export default ScreenshotBucketType
