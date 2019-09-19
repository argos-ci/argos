const jobModelSchema = {
  required: ['jobStatus'],
  properties: {
    jobStatus: {
      type: 'string',
      enum: ['pending', 'progress', 'complete', 'error', 'aborted'],
    },
  },
}

export default jobModelSchema
