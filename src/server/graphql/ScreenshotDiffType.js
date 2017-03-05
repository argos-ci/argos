import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLID,
  GraphQLEnumType,
} from 'graphql'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import ScreenshotType, {
  resolve as resolveScreenshot,
} from 'server/graphql/ScreenshotType'

export function resolveList(source, args) {
  return ScreenshotDiff
    .query()
    .where({
      buildId: args.buildId,
    })
    .orderBy('score', 'desc')
}

export const validationStatusType = new GraphQLEnumType({
  description: 'Represent the user feedback after reviewing the diffs',
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
})

export function resolveSetValidationStatus(source, args) {
  return ScreenshotDiff
    .query()
    .where({
      buildId: args.buildId,
    })
    .patch({
      validationStatus: args.validationStatus,
    })
    .then(() => args.validationStatus)
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
      type: new GraphQLEnumType({
        description: 'Represent the state of the remote job generating the diffs',
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
      type: validationStatusType,
    },
    createdAt: {
      type: graphQLDateTime,
    },
    updatedAt: {
      type: graphQLDateTime,
    },
  },
})

export default ScreenshotDiffType
