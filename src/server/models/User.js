import BaseModel from 'server/models/BaseModel'

export default class User extends BaseModel {
  static tableName = 'users';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'githubId',
      'name',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      githubId: { type: 'number' },
      accessToken: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
    },
  };

  static relationMappings = {
    organizations: {
      relation: BaseModel.ManyToManyRelation,
      modelClass: 'Organization',
      join: {
        from: 'users.id',
        through: {
          from: 'user_organizations.userId',
          to: 'user_organizations.organizationId',
        },
        to: 'organizations.id',
      },
    },
  }
}
