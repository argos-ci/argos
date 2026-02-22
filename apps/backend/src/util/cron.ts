import { withScope } from "@sentry/node";
import cron, { type TaskFn } from "node-cron";

import parentLogger from "@/logger";
import { redisLock } from "@/util/redis";

const CRON_LOCK_KEY = ["cron", "saml-certificate-expiration"];

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
      withScope((scope) => {
        scope.setTag("cron", name);
        const markStart = performance.mark(`cron_task_${name}_start`);
        logger.info(`Start task`);
        redisLock
          .acquire(CRON_LOCK_KEY, () => func(context), {
            timeout: 55 * 60 * 1000,
          })
          .then(() => {
            const markEnd = performance.mark(`cron_task_${name}_end`);
            const measure = performance.measure(
              `cron_task_${name}`,
              markStart.name,
              markEnd.name,
            );
            logger.info(`Task done in ${measure.duration}`);
          })
          .catch((error) => {
            logger.error({ error }, "Task error");
          });
      });
    },
    { name },
  );
}
