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
    .select('builds.*')
    .innerJoin('repositories', 'repositories.id', 'builds.repositoryId')
    .innerJoin('organizations', 'organizations.id', 'repositories.organizationId')
    .where({
      'repositories.name': args.repositoryName,
      'organizations.name': args.profileName,
    })
    .orderBy('createdAt', 'desc')
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
