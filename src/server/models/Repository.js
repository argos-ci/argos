import BaseModel from 'server/models/BaseModel'

export default class Repository extends BaseModel {
  static tableName = 'repositories';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'githubId',
      'name',
      'enabled',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      githubId: { type: 'number' },
      name: { type: 'string' },
      enabled: { type: 'boolean' },
      token: { type: 'string' },
      organizationId: { type: 'string' },
      userId: { type: 'string' },
    },
  };

  static relationMappings = {
    organization: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Organization',
      join: {
        from: 'repositories.organizationId',
        to: 'organizations.id',
      },
    },
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'repositories.userId',
        to: 'users.id',
      },
    },
  };
}
