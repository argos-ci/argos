import BaseModel from 'server/models/BaseModel'
import reduceJobStatus from 'modules/jobs/reduceJobStatus'
import User from './User'
import ScreenshotDiff from './ScreenshotDiff'

export default class Build extends BaseModel {
  static tableName = 'builds';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'compareScreenshotBucketId',
      'repositoryId',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      baseScreenshotBucketId: { type: 'string' },
      compareScreenshotBucketId: { type: 'string' },
      repositoryId: { type: 'string' },
    },
  };

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
  };

  async getUsers() {
    return User.query()
      .select('users.*')
      .join('user_repository_rights', 'users.id', '=', 'user_repository_rights.userId')
      .join('repositories', 'user_repository_rights.repositoryId', '=', 'repositories.id')
      .join('builds', 'repositories.id', '=', 'builds.repositoryId')
      .where('builds.id', this.id)
  }

  async getStatus() {
    const screenshotDiffs = await ScreenshotDiff.query().where({ buildId: this.id })
    const jobStatus = reduceJobStatus(screenshotDiffs.map(({ jobStatus }) => jobStatus))

    if (jobStatus === 'complete') {
      const hasDiffs = screenshotDiffs.some(({ score }) => score > 0)
      return hasDiffs ? 'failure' : 'success'
    }

    return jobStatus
  }
}
