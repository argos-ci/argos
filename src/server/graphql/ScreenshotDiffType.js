import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLEnumType,
} from 'graphql'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import ScreenshotType, {
  resolve as resolveScreenshot,
} from 'server/graphql/ScreenshotType'

export const resolve = (source, args) => {
  return ScreenshotDiff
    .query()
    .where({
      buildId: args.buildId,
    })
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
      type: GraphQLString,
    },
    jobStatus: {
      type: new GraphQLEnumType({
        name: 'jobDiffStatus',
        values: {
          pending: {
            value: 'pending',
          },
          progress: {
            value: 'progress',
          },
          done: {
            value: 'done',
          },
        },
        description: 'Represent the state of the remote job generating the diffs',
      }),
    },
    validationStatus: {
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
        description: 'Represent the state of the remote job generating the diffs',
      }),
    },
    createdAt: {
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
  },
})

export default ScreenshotDiffType
