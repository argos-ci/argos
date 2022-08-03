import { Model, mergeSchemas, timestampsSchema } from '../util'
import { Organization } from './Organization'
import { User } from './User'

export class Account extends Model {
  static get tableName() {
    return 'accounts'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      properties: {
        userId: { type: ['string', null] },
        organizationId: { type: ['string', null] },
      },
    })
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'actions.userId',
          to: 'user.id',
        },
      },
      organization: {
        relation: Model.HasOneRelation,
        modelClass: Organization,
        join: {
          from: 'actions.organizationId',
          to: 'organization.id',
        },
      },
    }
  }
}
