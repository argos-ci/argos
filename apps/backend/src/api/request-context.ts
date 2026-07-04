/**
 * Per-request async context for the API.
 *
 * Backed by an {@link AsyncLocalStorage} established once per request by the
 * global handler. It powers {@link waitUntil}: background work that runs
 * concurrently with the handler but is still awaited before the response is
 * flushed, so nothing escapes the request lifecycle (unlike a bare
 * fire-and-forget promise, which would resolve after the process has already
 * responded — or moved on).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { Response } from "express";

import logger from "@/logger";

type RequestScope = {
  /** Background tasks to await before the response is flushed. */
  tasks: Set<Promise<unknown>>;
};

const storage = new AsyncLocalStorage<RequestScope>();

/**
 * Run `fn` within a fresh request scope. Every `waitUntil` call made while `fn`
 * (and the async work it spawns) runs is collected on this scope.
 */
export function runInRequestScope<T>(fn: () => T): T {
  return storage.run({ tasks: new Set() }, fn);
}

/**
 * Register background work tied to the current API request.
 *
 * Within a request the work runs concurrently with the rest of the request and
 * `waitUntil` resolves immediately: the response is simply not flushed until
 * the work settles (see {@link gateResponseOnRequestScope}), so it never
 * escapes the request lifecycle. Callers therefore don't block on it.
 *
 * Outside of a request scope (a script, a direct call, a test) there is no
 * response to hold the work, so `waitUntil` runs it directly and awaits it —
 * callers that `await waitUntil(...)` still observe it complete. Failures are
 * always logged and never propagate to the caller.
 */
export async function waitUntil(work: PromiseLike<unknown>): Promise<void> {
  const task = Promise.resolve(work).catch((error: unknown) => {
    logger.error({ error });
  });
  const scope = storage.getStore();
  if (scope) {
    scope.tasks.add(task);
    return;
  }
  await task;
}

/**
 * Await every registered background task, draining tasks a task may itself
 * register in turn.
 */
async function drainScope(scope: RequestScope): Promise<void> {
  while (scope.tasks.size > 0) {
    const pending = [...scope.tasks];
    scope.tasks.clear();
    await Promise.all(pending);
  }
}

/**
 * Defer the response's socket close until every {@link waitUntil} task has
 * settled, by wrapping `res.end`. Must be called within the request scope; the
 * scope is captured so the deferral works regardless of the async context
 * `res.end` is ultimately called from.
 */
export function gateResponseOnRequestScope(res: Response): void {
  const scope = storage.getStore();
  if (!scope) {
    return;
  }
  const realEnd = res.end.bind(res) as (...args: unknown[]) => Response;
  let draining = false;
  res.end = function (this: Response, ...args: unknown[]): Response {
    // Re-entrant call from within the drain continuation: end for real.
    if (draining || scope.tasks.size === 0) {
      return realEnd(...args);
    }
    draining = true;
    void drainScope(scope).finally(() => {
      realEnd(...args);
    });
    return this;
  } as Response["end"];
}
