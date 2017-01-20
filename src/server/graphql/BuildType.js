import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
} from 'graphql'
import Build from 'server/models/Build'
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'

export const resolve = (source, args) => {
  return Build
    .query()
    .where({
      id: args.id,
    })
    // .eager('screenshotBucket')
    .then(([build]) => {
      return build
    })
}

const BuildType = new GraphQLObjectType({
  name: 'Build',
  fields: {
    id: {
      type: GraphQLID,
    },
    baseScreenshotBucketId: {
      type: GraphQLString,
    },
    baseScreenshotBucket: {
      type: ScreenshotBucketType,
      resolve: source => (
        resolveScreenshotBucket(source, {
          id: source.baseScreenshotBucketId,
        })
      ),
    },
    compareScreenshotBucketId: {
      type: GraphQLString,
    },
    compareScreenshotBucket: {
      type: ScreenshotBucketType,
      resolve: source => (
        resolveScreenshotBucket(source, {
          id: source.compareScreenshotBucketId,
        })
      ),
    },
    createdAt: {
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
  },
})

export default BuildType
