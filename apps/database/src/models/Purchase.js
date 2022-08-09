import { Model, mergeSchemas, timestampsSchema } from '../util'
import { Account } from './Account'
import { Organization } from './Organization'
import { Plan } from './Plan'
import { User } from './User'

export class Purchase extends Model {
  static get tableName() {
    return 'purchases'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ['accountId', 'planId'],
      properties: {
        accountId: { type: ['string', null] },
        planId: { type: ['string', null] },
        endDate: { type: ['string', null] },
        startDate: { type: ['string', null] },
      },
    })
  }

  static get relationMappings() {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'purchases.accountId',
          to: 'accounts.id',
        },
      },
      user: {
        relation: Model.HasOneThroughRelation,
        modelClass: User,
        join: {
          from: 'purchases.accountId',
          through: {
            from: 'accounts.id',
            to: 'accounts.userId',
          },
          to: 'users.id',
        },
      },
      organization: {
        relation: Model.HasOneThroughRelation,
        modelClass: Organization,
        join: {
          from: 'purchases.accountId',
          through: {
            from: 'accounts.id',
            to: 'accounts.organizationId',
          },
          to: 'organizations.id',
        },
      },
      plan: {
        relation: Model.BelongsToOneRelation,
        modelClass: Plan,
        join: {
          from: 'purchases.planId',
          to: 'plans.id',
        },
      },
    }
  }
}
