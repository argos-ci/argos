import * as Sentry from "@sentry/node";
import cron, { type TaskFn } from "node-cron";

import parentLogger from "@/logger";
import { redisLock } from "@/util/redis";

/**
 * Schedule a new cron.
 */
export function scheduleCron(name: string, expression: string, func: TaskFn) {
  const logger = parentLogger.child({
    module: "cron",
    cron: name,
  });
  cron.schedule(
    expression,
    (context) => {
      Sentry.withScope((scope) => {
        scope.setTag("cron", name);
        const markStart = performance.mark(`cron_task_${name}_start`);
        logger.info("Start task");
        Sentry.startSpan(
          {
            name: "cron.run",
            attributes: {
              "argos.cron.name": name,
            },
          },
          () =>
            redisLock
              .coalesce(["cron", name], () => func(context), {
                timeout: 55 * 60 * 1000,
              })
              .then(() => {
                const markEnd = performance.mark(`cron_task_${name}_end`);
                const measure = performance.measure(
                  `cron_task_${name}`,
                  markStart.name,
                  markEnd.name,
                );
                logger.info(
                  {
                    duration: measure.duration,
                  },
                  `Task done in ${measure.duration}`,
                );
              }),
        ).catch((error) => {
          logger.error({ error }, "Task error");
        });
      });
    },
    { name },
  );
}
