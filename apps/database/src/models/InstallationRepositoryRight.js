import { Model, mergeSchemas, timestampsSchema } from '../util'
import { Installation } from './Installation'
import { Repository } from './Repository'

export class InstallationRepositoryRight extends Model {
  static get tableName() {
    return 'installation_repository_rights'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ['installationId', 'repositoryId'],
      properties: {
        installationId: { type: 'string' },
        repositoryId: { type: 'string' },
      },
    })
  }

  static get relationMappings() {
    return {
      installation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Installation,
        join: {
          from: 'installation_repository_rights.installationId',
          to: 'installations.id',
        },
      },
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: 'installation_repository_rights.repositoryId',
          to: 'repositories.id',
        },
      },
    }
  }
}
