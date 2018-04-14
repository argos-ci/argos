import { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLEnumType, GraphQLList } from 'graphql'
import Build from 'server/models/Build'
// eslint-disable-next-line max-len
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'
import ScreenshotDiffType from 'server/graphql/ScreenshotDiffType'
import RepositoryType from 'server/graphql/RepositoryType'
import Repository from 'server/models/Repository'
import graphQLDateTime from 'modules/graphql/graphQLDateTime'

export async function resolve(source, args, context) {
  const build = await Build.query()
    .findById(args.id)
    .eager('repository')

  if (!build || !await Repository.isAccessible(build.repository, context.user)) {
    return null
  }

  build.status = await build.getStatus({ useValidation: true })
  return build
}

export async function resolveList(repository, args) {
  const result = await Build.query()
    .where({ repositoryId: repository.id })
    .whereNot({ number: 0 })
    .orderBy('createdAt', 'desc')
    .range(args.after, args.after + args.first - 1)

  const hasNextPage = args.after + args.first < result.total
  const statuses = await Promise.all(
    result.results.map(build =>
      build.getStatus({
        useValidation: true,
      })
    )
  )

  return {
    pageInfo: {
      totalCount: result.total,
      hasNextPage,
      endCursor: hasNextPage ? args.after + args.first : result.total,
    },
    edges: result.results.map((build, index) => {
      const newBuild = build
      newBuild.status = statuses[index]
      return newBuild
    }),
  }
}

export function resolveSample(repository) {
  return Build.query()
    .where({
      repositoryId: repository.id,
      number: 0,
    })
    .pluck('id')
    .limit(1)
    .first()
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
      resolve: source =>
        source
          .$relatedQuery('screenshotDiffs')
          .leftJoin('screenshots', 'screenshots.id', 'screenshot_diffs.baseScreenshotId')
          .orderBy('score', 'desc')
          .orderBy('screenshots.name', 'asc'),
    },
    baseScreenshotBucketId: {
      type: GraphQLString,
    },
    baseScreenshotBucket: {
      type: ScreenshotBucketType,
      resolve: source =>
        resolveScreenshotBucket(source, {
          id: source.baseScreenshotBucketId,
        }),
    },
    compareScreenshotBucketId: {
      type: GraphQLString,
    },
    compareScreenshotBucket: {
      type: ScreenshotBucketType,
      resolve: source =>
        resolveScreenshotBucket(source, {
          id: source.compareScreenshotBucketId,
        }),
    },
    repository: {
      type: RepositoryType,
      resolve: async source => {
        const build = await source.$query().eager('repository')
        return build.repository
      },
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
          error: {
            value: 'error',
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
