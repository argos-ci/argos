import { ValidationError } from 'objection'
import config from '@argos-ci/config'
import {
  Model,
  mergeSchemas,
  timestampsSchema,
  jobModelSchema,
  reduceJobStatus,
} from '../util'
import { User } from './User'
import { ScreenshotBucket } from './ScreenshotBucket'
import { ScreenshotDiff } from './ScreenshotDiff'
import { Repository } from './Repository'

const NEXT_NUMBER = Symbol('nextNumber')

export class Build extends Model {
  static get tableName() {
    return 'builds'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, jobModelSchema, {
      required: ['compareScreenshotBucketId', 'repositoryId'],
      properties: {
        baseScreenshotBucketId: { types: ['string', null] },
        compareScreenshotBucketId: { type: 'string' },
        repositoryId: { type: 'string' },
        number: { type: 'integer' },
        externalId: { type: ['string', null] },
        batchCount: { type: ['integer', null] },
      },
    })
  }

  static get relationMappings() {
    return {
      baseScreenshotBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotBucket,
        join: {
          from: 'builds.baseScreenshotBucketId',
          to: 'screenshot_buckets.id',
        },
      },
      compareScreenshotBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotBucket,
        join: {
          from: 'builds.compareScreenshotBucketId',
          to: 'screenshot_buckets.id',
        },
      },
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: 'builds.repositoryId',
          to: 'repositories.id',
        },
      },
      screenshotDiffs: {
        relation: Model.HasManyRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: 'builds.id',
          to: 'screenshot_diffs.buildId',
        },
      },
    }
  }

  // eslint-disable-next-line class-methods-use-this
  $afterValidate(json) {
    if (
      json.baseScreenshotBucketId &&
      json.baseScreenshotBucketId === json.compareScreenshotBucketId
    ) {
      throw new ValidationError({
        type: ValidationError.Type.ModelValidation,
        message:
          'The base screenshot bucket should be different to the compare one.',
      })
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
        this.repositoryId,
      )
    }
    return json
  }

  $afterInsert(queryContext) {
    super.$afterInsert(queryContext)
    return this.reload(queryContext)
  }

  static async getStatus(
    build,
    { useScore = true, useValidation = false } = {},
  ) {
    // If something bad happened at the build level
    if (build.jobStatus !== 'complete') {
      return build.jobStatus
    }

    if (!build.screenshotDiffs) {
      await build.$fetchGraph('screenshotDiffs')
    }

    const { screenshotDiffs } = build

    const jobStatus = reduceJobStatus(
      screenshotDiffs.map((screenshotDiff) => screenshotDiff.jobStatus),
    )

    if (jobStatus !== 'complete') return jobStatus

    if (useScore && useValidation) {
      const hasRejectedOrDiffs = screenshotDiffs.some(
        ({ score, validationStatus }) =>
          validationStatus === ScreenshotDiff.VALIDATION_STATUSES.rejected ||
          (validationStatus === ScreenshotDiff.VALIDATION_STATUSES.unknown &&
            score > 0),
      )

      return hasRejectedOrDiffs ? 'failure' : 'success'
    }

    if (useScore) {
      const hasDiffs = screenshotDiffs.some(({ score }) => score > 0)
      return hasDiffs ? 'failure' : 'success'
    }

    if (useValidation) {
      const hasRejected = screenshotDiffs.some(
        ({ validationStatus }) =>
          validationStatus === ScreenshotDiff.VALIDATION_STATUSES.rejected,
      )

      return hasRejected ? 'failure' : 'success'
    }

    throw new Error(`"useScore" or "useValidation" is required`)
  }

  $getStatus(options) {
    return this.constructor.getStatus(this, options)
  }

  static getUsers(buildId, { trx } = {}) {
    return User.query(trx)
      .select('users.*')
      .join(
        'user_repository_rights',
        'users.id',
        '=',
        'user_repository_rights.userId',
      )
      .join(
        'repositories',
        'user_repository_rights.repositoryId',
        '=',
        'repositories.id',
      )
      .join('builds', 'repositories.id', '=', 'builds.repositoryId')
      .where('builds.id', buildId)
  }

  getUsers(options) {
    return this.constructor.getUsers(this.id, options)
  }

  async getUrl({ trx } = {}) {
    if (!this.repository) {
      await this.$fetchGraph('repository', { transaction: trx })
    }

    const owner = await this.repository.$relatedOwner({ trx })

    // const owner = await repository.getOwner()
    const pathname = `/${owner.login}/${this.repository.name}/builds/${this.number}`

    return `${config.get('server.url')}${pathname}`
  }
}
