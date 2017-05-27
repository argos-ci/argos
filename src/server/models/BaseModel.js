import { Model } from 'objection'

export function mergeSchemas(...schemas) {
  return schemas.reduce(
    (mergedSchema, schema) => ({
      ...mergedSchema,
      ...schema,
      required: [...mergedSchema.required, ...schema.required],
      properties: {
        ...mergedSchema.properties,
        ...schema.properties,
      },
    }),
    {
      required: [],
      properties: {},
    }
  )
}

export default class BaseModel extends Model {
  // Uses http://json-schema.org/latest/json-schema-validation.html
  static jsonSchema = {
    type: 'object',
    required: [],
    properties: {
      id: {
        type: ['integer', 'string'],
      },
      createdAt: {
        type: 'string',
      },
      updatedAt: {
        type: 'string',
      },
    },
  }

  // Centralize the models.
  static modelPaths = [__dirname]

  // http://vincit.github.io/objection.js/#defaulteageralgorithm
  static defaultEagerAlgorithm = Model.JoinEagerAlgorithm

  $beforeInsert() {
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString()
    }

    this.updatedAt = new Date().toISOString()
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }

  async reload() {
    const model = await this.$query()
    Object.assign(this, model)
    return this
  }
}
