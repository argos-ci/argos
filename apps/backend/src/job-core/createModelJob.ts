import type { ModelClass } from "objection";

import { createJob } from "./createJob";
import type { Job, JobContext, JobParams } from "./createJob";

/**
 * Far longer than a row waits in the queue, so a job still on its way is not
 * queued twice.
 */
const STALLED_JOB_DELAY_MS = 10 * 60 * 1000;

/**
 * Older pending rows are left alone: a day outlasts any outage, and the first
 * sweep must not send every row stranded before it existed.
 */
const STALLED_JOB_MAX_AGE_MS = 24 * 3600 * 1000;

export interface ModelJob extends Job<string> {
  /**
   * Queue again the pending rows no job ever picked up: the push that follows
   * their commit can fail, and nothing else would send them.
   */
  requeueStalled: (now: Date) => Promise<void>;
}

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
    /**
     * When a pending row was handed to the queue, what `requeueStalled`
     * measures its wait from.
     * @default "createdAt"
     */
    queuedAtColumn?: keyof InstanceType<TModelConstructor> & string;
  },
): ModelJob => {
  const {
    ignoreMissing = false,
    queuedAtColumn = "createdAt",
    ...jobParams
  } = params ?? {};
  const job = createJob<string>(
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
  const modelJob: ModelJob = {
    ...job,
    async requeueStalled(now) {
      const stalled: { id: string }[] = await Model.query()
        .select("id")
        .where("jobStatus", "pending")
        .where(
          queuedAtColumn,
          "<",
          new Date(now.getTime() - STALLED_JOB_DELAY_MS).toISOString(),
        )
        .where(
          queuedAtColumn,
          ">",
          new Date(now.getTime() - STALLED_JOB_MAX_AGE_MS).toISOString(),
        );
      if (stalled.length > 0) {
        await modelJob.push(...stalled.map((row) => row.id));
      }
    },
  };
  return modelJob;
};
