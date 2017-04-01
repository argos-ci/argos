import { ValidationError } from 'objection'
import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import jobModelSchema from 'server/models/schemas/jobModelSchema'
import { VALIDATION_STATUS } from 'server/models/constant'

export default class ScreenshotDiff extends BaseModel {
  static tableName = 'screenshot_diffs';

  static jsonSchema = mergeSchemas(
    BaseModel.jsonSchema,
    jobModelSchema,
    {
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
            VALIDATION_STATUS.unknown,
            VALIDATION_STATUS.accepted,
            VALIDATION_STATUS.rejected,
          ],
        },
      },
    },
  );

  static relationMappings = {
    build: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Build',
      join: {
        from: 'screenshot_diffs.buildId',
        to: 'builds.id',
      },
    },
    baseScreenshot: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Screenshot',
      join: {
        from: 'screenshot_diffs.baseScreenshotId',
        to: 'screenshots.id',
      },
    },
    compareScreenshot: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Screenshot',
      join: {
        from: 'screenshot_diffs.compareScreenshotId',
        to: 'screenshots.id',
      },
    },
  };

  $parseDatabaseJson(json) {
    json = super.$parseDatabaseJson(json)

    if (typeof json.score === 'string') {
      json.score = Number(json.score)
    }

    return json
  }

  $afterValidate(json) { // eslint-disable-line class-methods-use-this
    if (json.baseScreenshotId && json.baseScreenshotId === json.compareScreenshotId) {
      throw new ValidationError('The base screenshot should be different to the compare one.')
    }
  }
}
