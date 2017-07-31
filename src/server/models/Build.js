import { ValidationError } from 'objection'
import reduceJobStatus from 'modules/jobs/reduceJobStatus'
import { VALIDATION_STATUS } from 'server/constants'
import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import User from 'server/models/User'
import jobModelSchema from 'server/models/schemas/jobModelSchema'
import ScreenshotDiff from 'server/models/ScreenshotDiff'

const NEXT_NUMBER = Symbol('nextNumber')

export default class Build extends BaseModel {
  static tableName = 'builds'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, jobModelSchema, {
    required: ['compareScreenshotBucketId', 'repositoryId'],
    properties: {
      baseScreenshotBucketId: { types: ['string', null] },
      compareScreenshotBucketId: { type: 'string' },
      repositoryId: { type: 'string' },
      number: { type: 'integer' },
    },
  })

  static relationMappings = {
    baseScreenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'builds.baseScreenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
    compareScreenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'builds.compareScreenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
    repository: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Repository',
      join: {
        from: 'builds.repositoryId',
        to: 'repositories.id',
      },
    },
    screenshotDiffs: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'ScreenshotDiff',
      join: {
        from: 'builds.id',
        to: 'screenshot_diffs.buildId',
      },
    },
  }

  // eslint-disable-next-line class-methods-use-this
  $afterValidate(json) {
    if (
      json.baseScreenshotBucketId &&
      json.baseScreenshotBucketId === json.compareScreenshotBucketId
    ) {
      throw new ValidationError(
        'The base screenshot bucket should be different to the compare one.'
      )
    }
  }

  $beforeInsert(queryContext) {
    super.$beforeInsert(queryContext)
    if (this.number === undefined) {
      this.number = NEXT_NUMBER
    }
  }

  $toDatabaseJson(queryContext) {
    const json = super.$toDatabaseJson(queryContext)
    if (json.number === NEXT_NUMBER) {
      json.number = this.$knex().raw(
        '(select coalesce(max(number),0) + 1 as number from builds where "repositoryId" = ?)',
        this.repositoryId
      )
    }
    return json
  }

  $afterInsert(queryContext) {
    super.$afterInsert(queryContext)
    return this.reload()
  }

  static async getStatus(build, options = {}) {
    const { useScore = true, useValidation = false } = options

    // If something bad happened at the build level
    if (build.jobStatus !== 'complete') {
      return build.jobStatus
    }

    const screenshotDiffs = await ScreenshotDiff.query().where({
      buildId: build.id,
    })
    const jobStatus = reduceJobStatus(
      screenshotDiffs.map(screenshotDiff => screenshotDiff.jobStatus)
    )

    if (jobStatus === 'complete') {
      if (useValidation && useScore) {
        const isFailure = screenshotDiffs.some(
          ({ score, validationStatus }) =>
            validationStatus === VALIDATION_STATUS.rejected ||
            (validationStatus === VALIDATION_STATUS.unknown && score > 0)
        )
        return isFailure ? 'failure' : 'success'
      } else if (useScore) {
        const hasDiffs = screenshotDiffs.some(({ score }) => score > 0)
        return hasDiffs ? 'failure' : 'success'
      }

      throw new Error('Those options are not supported', options)
    }

    return jobStatus
  }

  getStatus(options) {
    return this.constructor.getStatus(this, options)
  }

  static getUsers(buildId) {
    return User.query()
      .select('users.*')
      .join('user_repository_rights', 'users.id', '=', 'user_repository_rights.userId')
      .join('repositories', 'user_repository_rights.repositoryId', '=', 'repositories.id')
      .join('builds', 'repositories.id', '=', 'builds.repositoryId')
      .where('builds.id', buildId)
  }

  getUsers() {
    return this.constructor.getUsers(this.id)
  }
}
