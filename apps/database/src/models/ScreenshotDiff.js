import { ValidationError } from 'objection'
import { Model, mergeSchemas, timestampsSchema, jobModelSchema } from '../util'
import { Build } from './Build'
import { Screenshot } from './Screenshot'

export class ScreenshotDiff extends Model {
  static get tableName() {
    return 'screenshot_diffs'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, jobModelSchema, {
      required: [
        'buildId',
        'baseScreenshotId',
        'compareScreenshotId',
        'validationStatus',
      ],
      properties: {
        buildId: { type: 'string' },
        baseScreenshotId: { type: ['string', null] },
        compareScreenshotId: { type: 'string' },
        s3Id: { type: ['string', null] },
        score: {
          type: 'number',
          minimum: 0,
          maximum: 1,
        },
        validationStatus: {
          type: 'string',
          enum: [
            ScreenshotDiff.VALIDATION_STATUSES.unknown,
            ScreenshotDiff.VALIDATION_STATUSES.accepted,
            ScreenshotDiff.VALIDATION_STATUSES.rejected,
          ],
        },
      },
    })
  }

  static get relationMappings() {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: 'screenshot_diffs.buildId',
          to: 'builds.id',
        },
      },
      baseScreenshot: {
        relation: Model.BelongsToOneRelation,
        modelClass: Screenshot,
        join: {
          from: 'screenshot_diffs.baseScreenshotId',
          to: 'screenshots.id',
        },
      },
      compareScreenshot: {
        relation: Model.BelongsToOneRelation,
        modelClass: Screenshot,
        join: {
          from: 'screenshot_diffs.compareScreenshotId',
          to: 'screenshots.id',
        },
      },
    }
  }

  static get VALIDATION_STATUSES() {
    return {
      unknown: 'unknown',
      accepted: 'accepted',
      rejected: 'rejected',
    }
  }

  $parseDatabaseJson(json) {
    const newJson = super.$parseDatabaseJson(json)

    if (typeof newJson.score === 'string') {
      newJson.score = Number(newJson.score)
    }

    return newJson
  }

  // eslint-disable-next-line class-methods-use-this
  $afterValidate(json) {
    if (
      json.baseScreenshotId &&
      json.baseScreenshotId === json.compareScreenshotId
    ) {
      throw new ValidationError({
        type: ValidationError.Type.ModelValidation,
        message: 'The base screenshot should be different to the compare one.',
      })
    }
  }
}
