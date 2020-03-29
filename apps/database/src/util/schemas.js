export const timestampsSchema = {
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

export const jobModelSchema = {
  required: ['jobStatus'],
  properties: {
    jobStatus: {
      type: 'string',
      enum: ['pending', 'progress', 'complete', 'error', 'aborted'],
    },
  },
}

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
    },
  )
}
