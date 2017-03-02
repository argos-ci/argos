import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
} from 'graphql'
import GraphQLDateTime from 'modules/graphQL/GraphQLDateTime'
import ScreenshotBucket from 'server/models/ScreenshotBucket'

export const resolve = (source, args) => {
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
      type: GraphQLDateTime,
    },
    updatedAt: {
      type: GraphQLDateTime,
    },
  },
})

export default ScreenshotBucketType
