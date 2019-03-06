import createJob from 'modules/jobs/createJob'

const createModelJob = (queue, Model, perform) =>
  createJob(queue, {
    async perform(id) {
      const model = await Model.query().findById(id)

      if (!model) {
        throw new Error(`${Model.name} not found`)
      }

      await model.$query().patch({ jobStatus: 'progress' })
      await perform(model)
    },
    async error(id) {
      await Model.query()
        .patch({ jobStatus: 'error' })
        .where({ id })
    },
    async complete(id) {
      await Model.query()
        .patch({ jobStatus: 'complete' })
        .where({ id })
    },
  })

export default createModelJob
