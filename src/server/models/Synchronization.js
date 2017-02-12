import BaseModel from 'server/models/BaseModel'

export default class Synchronization extends BaseModel {
  static tableName = 'synchronizations';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'userId',
      'jobStatus',
      'type',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      userId: { type: 'string' },
      jobStatus: {
        type: 'string',
        enum: [
          'pending',
          'progress',
          'complete',
        ],
      },
      type: {
        type: 'string',
        enum: [
          'github',
        ],
      },
    },
  };

  static relationMappings = {
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'synchronizations.userId',
        to: 'users.id',
      },
    },
  };
}
