import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLEnumType,
} from 'graphql'
import Build from 'server/models/Build'
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'
import GraphQLDateTime from 'modules/graphQL/GraphQLDateTime'

export const resolve = (source, args) => {
  return Build
    .query()
    .findById(args.id)
    .then(async (build) => {
      const status = await build.getStatus()

      return {
        ...build,
        status,
      }
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
    .range(args.after, (args.after + args.first) - 1)
    .then(async (result) => {
      const hasNextPage = args.after + args.first < result.total
      const statuses = await Promise.all(result.results.map(build => build.getStatus()))

      return {
        pageInfo: {
          totalCount: result.total,
          hasNextPage,
          endCursor: hasNextPage ? args.after + args.first : result.total,
        },
        edges: result.results.map((build, index) => {
          build.status = statuses[index]
          return build
        }),
      }
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
    number: {
      description: `
        Continuous number.
        It is increameted after each build for a given repository.
      `,
      type: GraphQLInt,
    },
    status: {
      description: 'Aggregate view on the build status',
      type: new GraphQLEnumType({
        name: 'status',
        values: {
          pending: {
            value: 'pending',
          },
          progress: {
            value: 'progress',
          },
          failure: {
            value: 'failure',
          },
          success: {
            value: 'success',
          },
        },
      }),
    },
    createdAt: {
      type: GraphQLDateTime,
    },
    updatedAt: {
      type: GraphQLDateTime,
    },
  },
})

export default BuildType
