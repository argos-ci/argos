import { GraphQLObjectType, GraphQLFloat, GraphQLString, GraphQLEnumType } from 'graphql'
import graphQLDateTime from 'modules/graphql/graphQLDateTime'
import { pushBuildNotification } from 'modules/build/notifications'
import Build from 'server/models/Build'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import APIError from 'server/graphql/APIError'
import { VALIDATION_STATUS } from 'server/constants'
import ScreenshotType, { resolve as resolveScreenshot } from 'server/graphql/ScreenshotType'

export const validationStatusType = new GraphQLEnumType({
  description: 'Represent the user feedback after reviewing the diffs',
  name: 'validationStatus',
  values: {
    unknown: {
      value: VALIDATION_STATUS.unknown,
    },
    accepted: {
      value: VALIDATION_STATUS.accepted,
    },
    rejected: {
      value: VALIDATION_STATUS.rejected,
    },
  },
})

export async function setValidationStatus(source, args, context) {
  if (!context.user) {
    throw new APIError('Invalid user identification')
  }

  const { buildId, validationStatus } = args
  const user = await Build.getUsers(buildId).findById(context.user.id)

  if (!user) {
    throw new APIError('Invalid user authorization')
  }

  await ScreenshotDiff.query()
    .where({ buildId })
    .patch({ validationStatus })

  // That might be better suited into a $afterUpdate hook.
  if (validationStatus === VALIDATION_STATUS.accepted) {
    await pushBuildNotification({
      buildId,
      type: 'diff-accepted',
    })
  } else if (validationStatus === VALIDATION_STATUS.rejected) {
    await pushBuildNotification({
      buildId,
      type: 'diff-rejected',
    })
  }

  return validationStatus
}

const ScreenshotDiffType = new GraphQLObjectType({
  name: 'ScreenshotDiff',
  fields: {
    id: {
      type: GraphQLString,
    },
    buildId: {
      type: GraphQLString,
    },
    baseScreenshotId: {
      type: GraphQLString,
    },
    baseScreenshot: {
      type: ScreenshotType,
      resolve: source =>
        resolveScreenshot(source, {
          id: source.baseScreenshotId,
        }),
    },
    compareScreenshotId: {
      type: GraphQLString,
    },
    compareScreenshot: {
      type: ScreenshotType,
      resolve: source =>
        resolveScreenshot(source, {
          id: source.compareScreenshotId,
        }),
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
          error: {
            value: 'error',
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
