import type { ModelClass } from "objection";

import logger from "@/logger/index.js";

import { createJob } from "./createJob.js";
import type { JobParams } from "./createJob.js";

export const createModelJob = <TModelConstructor extends ModelClass<any>>(
  queue: string,
  Model: TModelConstructor,
  perform: (model: InstanceType<TModelConstructor>) => void | Promise<void>,
  params?: JobParams,
) => {
  return createJob<string>(
    queue,
    {
      perform: async (id) => {
        logger.info(`Processing ${Model.name} ${id}`);
        const model = await Model.query().findById(id);

        if (!model) {
          throw new Error(`${Model.name} not found`);
        }

        if (model.jobStatus === "complete") {
          logger.info(`${Model.name} ${id} already complete`);
          return;
        }

        await model.$query().patch({ jobStatus: "progress" }).returning("*");
        await perform(model);
      },
      error: async (id) => {
        await Model.query().patch({ jobStatus: "error" }).where({ id });
      },
      complete: async (id) => {
        await Model.query().patch({ jobStatus: "complete" }).where({ id });
      },
    },
    params,
  );
};
