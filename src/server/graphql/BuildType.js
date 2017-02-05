import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
} from 'graphql'
import Build from 'server/models/Build'
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'
import GraphQLDateType from 'graphql-custom-datetype'

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

export const resolveList = (source, args) => {
  return Build
    .query()
    .eager('repository')
    .where({
      'repository.githubId': args.repositoryGithubId,
    })
    // .orderBy('createdAt', 'desc') Do not work #WTF
    .then((builds) => {
      return builds.sort((a, b) => {
        if (a.createdAt < b.createdAt) {
          return 1
        } else if (a.createdAt > b.createdAt) {
          return -1
        }

        return 0
      })
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
      type: GraphQLDateType,
    },
    updatedAt: {
      type: GraphQLDateType,
    },
  },
})

export default BuildType
