import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

export default class UserRepositoryRight extends BaseModel {
  static tableName = 'user_repository_rights'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['userId', 'repositoryId'],
    properties: {
      userId: { type: 'string' },
      repositoryId: { type: 'string' },
    },
  })

  static relationMappings = {
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'user_repository_rights.userId',
        to: 'users.id',
      },
    },
    repository: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Repository',
      join: {
        from: 'user_repository_rights.repositoryId',
        to: 'repositories.id',
      },
    },
  }
}
