import { createJob } from "./createJob";

export function createModelJob(queue, Model, perform, params) {
  return createJob(
    queue,
    {
      async perform(id) {
        const model = await Model.query().findById(id);

        if (!model) {
          throw new Error(`${Model.name} not found`);
        }

        await model.$query().patch({ jobStatus: "progress" }).returning("*");
        await perform(model);
      },
      async error(id) {
        await Model.query().patch({ jobStatus: "error" }).where({ id });
      },
      async complete(id) {
        await Model.query().patch({ jobStatus: "complete" }).where({ id });
      },
    },
    params
  );
}
