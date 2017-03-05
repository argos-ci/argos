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
          from: 'user_organization_rights.userId',
          to: 'user_organization_rights.organizationId',
        },
        to: 'organizations.id',
      },
    },
    repositories: {
      relation: BaseModel.ManyToManyRelation,
      modelClass: 'Repository',
      join: {
        from: 'users.id',
        through: {
          from: 'user_repository_rights.userId',
          to: 'user_repository_rights.repositoryId',
        },
        to: 'repositories.id',
      },
    },
  }

  getUrlIdentifier() {
    return this.login
  }
}
