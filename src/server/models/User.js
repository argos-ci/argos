import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

export default class User extends BaseModel {
  static tableName = 'users';

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: [
      'githubId',
      'login',
    ],
    properties: {
      githubId: { type: 'number' },
      accessToken: { type: 'string' },
      name: { type: 'string' },
      login: { type: 'string' },
      email: { type: ['string', null] },
    },
  });

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

  getUrlIdentifier() {
    return this.login
  }
}
