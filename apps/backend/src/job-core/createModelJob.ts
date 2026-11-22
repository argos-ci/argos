import type { ModelClass } from "objection";

import { createJob } from "./createJob";
import type { JobContext, JobParams } from "./createJob";

export const createModelJob = <TModelConstructor extends ModelClass<any>>(
  queue: string,
  Model: TModelConstructor,
  perform: (
    model: InstanceType<TModelConstructor>,
    ctx: JobContext,
  ) => void | Promise<void>,
  params?: JobParams & {
    /**
     * Treat a row deleted before its job ran as done, for rows that cascade
     * away with their parent. Otherwise a missing row is an error, retried in
     * case it is not committed yet.
     */
    ignoreMissing?: boolean;
  },
) => {
  const { ignoreMissing = false, ...jobParams } = params ?? {};
  return createJob<string>(
    queue,
    {
      perform: async (id, ctx) => {
        const model = await Model.query().findById(id);

        if (!model) {
          if (ignoreMissing) {
            ctx.logger.info(`${Model.name} deleted, skipping`);
            return;
          }
          throw new Error(`${Model.name} not found`);
        }

        if (model.jobStatus === "complete") {
          ctx.logger.info("Already complete");
          return;
        }

        await model.$query().patch({ jobStatus: "progress" }).returning("*");
        await perform(model, ctx);
      },
      error: async (id) => {
        await Model.query().patch({ jobStatus: "error" }).where({ id });
      },
      complete: async (id) => {
        await Model.query().patch({ jobStatus: "complete" }).where({ id });
      },
    },
    jobParams,
  );
};
