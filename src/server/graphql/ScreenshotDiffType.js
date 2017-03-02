import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLID,
  GraphQLEnumType,
} from 'graphql'
import GraphQLDateTime from 'modules/graphQL/GraphQLDateTime'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import ScreenshotType, {
  resolve as resolveScreenshot,
} from 'server/graphql/ScreenshotType'

export const resolveList = (source, args) => {
  return ScreenshotDiff
    .query()
    .where({
      buildId: args.buildId,
    })
    .orderBy('score', 'desc')
}

const ScreenshotDiffType = new GraphQLObjectType({
  name: 'ScreenshotDiff',
  fields: {
    id: {
      type: GraphQLID,
    },
    buildId: {
      type: GraphQLString,
    },
    baseScreenshotId: {
      type: GraphQLString,
    },
    baseScreenshot: {
      type: ScreenshotType,
      resolve: source => (
        resolveScreenshot(source, {
          id: source.baseScreenshotId,
        })
      ),
    },
    compareScreenshotId: {
      type: GraphQLString,
    },
    compareScreenshot: {
      type: ScreenshotType,
      resolve: source => (
        resolveScreenshot(source, {
          id: source.compareScreenshotId,
        })
      ),
    },
    score: {
      type: GraphQLFloat,
    },
    s3Id: {
      type: GraphQLString,
    },
    jobStatus: {
      description: 'Represent the state of the remote job generating the diffs',
      type: new GraphQLEnumType({
        name: 'jobDiffStatus',
        values: {
          pending: {
            value: 'pending',
          },
          progress: {
            value: 'progress',
          },
          complete: {
            value: 'complete',
          },
        },
      }),
    },
    validationStatus: {
      description: 'Represent the state of the remote job generating the diffs',
      type: new GraphQLEnumType({
        name: 'validationStatus',
        values: {
          unknown: {
            value: 'unknown',
          },
          accepted: {
            value: 'accepted',
          },
          rejected: {
            value: 'rejected',
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

export default ScreenshotDiffType
