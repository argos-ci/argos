import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLEnumType,
  GraphQLList,
} from 'graphql'
import Build from 'server/models/Build'
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'
import ScreenshotDiffType from 'server/graphql/ScreenshotDiffType'
import { isRepositoryAccessible } from 'server/graphql/utils'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'

export async function resolve(source, args, context) {
  const build = await Build.query().findById(args.id).eager('repository')

  if (!build || !(await isRepositoryAccessible(build.repository, context))) {
    return null
  }

  build.status = await build.getStatus({ useValidation: true })
  return build
}

export async function resolveList(repository, args) {
  const result = await Build
    .query()
    .where({ repositoryId: repository.id })
    .orderBy('createdAt', 'desc')
    .range(args.after, (args.after + args.first) - 1)

  const hasNextPage = args.after + args.first < result.total
  const statuses = await Promise.all(
    result.results.map(build => build.getStatus({
      useValidation: true,
    })),
  )

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
}

const BuildType = new GraphQLObjectType({
  name: 'Build',
  fields: {
    id: {
      type: GraphQLString,
    },
    screenshotDiffs: {
      description: 'Get the diffs for a given build.',
      type: new GraphQLList(ScreenshotDiffType),
      resolve: build => build.$relatedQuery('screenshotDiffs').orderBy('score', 'desc'),
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
      type: graphQLDateTime,
    },
    updatedAt: {
      type: graphQLDateTime,
    },
  },
})

export default BuildType
