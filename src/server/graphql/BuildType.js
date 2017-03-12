import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLEnumType,
} from 'graphql'
import Build from 'server/models/Build'
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'

export function resolve(source, args) {
  return Build
    .query()
    .findById(args.id)
    .then(async (build) => {
      const status = await build.getStatus({
        useValidation: true,
      })

      return {
        ...build,
        status,
      }
    })
}

export async function resolveList(source, args, context) {
  const result = await Build
    .query()
    .select('builds.*')
    .innerJoin('repositories', 'repositories.id', 'builds.repositoryId')
    .innerJoin(
      'user_repository_rights',
      'user_repository_rights.repositoryId',
      'builds.repositoryId',
    )
    .leftJoin('organizations', 'organizations.id', 'repositories.organizationId')
    .leftJoin('users', 'users.id', 'repositories.userId')
    .where('repositories.name', args.repositoryName)
    .where('user_repository_rights.userId', context.user.id)
    .where('organizations.name', args.profileName)
    .orWhere('users.login', args.profileName)
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
