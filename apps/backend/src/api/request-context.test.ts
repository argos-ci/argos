import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import logger from "@/logger";

import {
  gateResponseOnRequestScope,
  runInRequestScope,
  waitUntil,
} from "./request-context";

vi.mock("@/logger", () => ({ default: { error: vi.fn() } }));

/** A promise plus its resolver, for deterministic ordering in tests. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.mocked(logger.error).mockClear();
});

describe("waitUntil outside a request scope", () => {
  it("runs the work directly and awaits it", async () => {
    let done = false;
    await waitUntil(Promise.resolve().then(() => void (done = true)));
    expect(done).toBe(true);
  });

  it("logs failures and resolves without throwing", async () => {
    const error = new Error("boom");
    await expect(waitUntil(Promise.reject(error))).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith({ error });
  });
});

describe("waitUntil inside a request scope", () => {
  it("resolves immediately without blocking on the work", async () => {
    const work = deferred();
    let done = false;

    await runInRequestScope(async () => {
      await waitUntil(work.promise.then(() => void (done = true)));
      // The work has not run yet: waitUntil returned before it settled.
      expect(done).toBe(false);
    });

    work.resolve();
    await work.promise;
  });
});

describe("gateResponseOnRequestScope", () => {
  function createResponse() {
    const realEnd = vi.fn(function (this: unknown) {
      return this;
    });
    const res = { end: realEnd } as unknown as Response & {
      end: typeof realEnd;
    };
    return { res, realEnd };
  }

  it("is a no-op outside a request scope", () => {
    const { res, realEnd } = createResponse();
    gateResponseOnRequestScope(res);
    expect(res.end).toBe(realEnd);
  });

  it("ends immediately when there is no pending work", async () => {
    const { res, realEnd } = createResponse();
    await runInRequestScope(() => {
      gateResponseOnRequestScope(res);
      res.end("body");
    });
    expect(realEnd).toHaveBeenCalledWith("body");
  });

  it("holds res.end until every waitUntil task settles", async () => {
    const { res, realEnd } = createResponse();
    const work = deferred();

    await runInRequestScope(async () => {
      gateResponseOnRequestScope(res);
      await waitUntil(work.promise);
      res.end("body");
      // Still pending: the response must not be flushed yet.
      expect(realEnd).not.toHaveBeenCalled();
    });

    work.resolve();
    await vi.waitFor(() => expect(realEnd).toHaveBeenCalledWith("body"));
  });

  it("still ends (and logs) when a background task fails", async () => {
    const { res, realEnd } = createResponse();
    const error = new Error("nope");

    await runInRequestScope(async () => {
      gateResponseOnRequestScope(res);
      await waitUntil(Promise.reject(error));
      res.end();
    });

    await vi.waitFor(() => expect(realEnd).toHaveBeenCalled());
    expect(logger.error).toHaveBeenCalledWith({ error });
  });

  it("drains tasks that other tasks register in turn", async () => {
    const { res, realEnd } = createResponse();
    const order: string[] = [];
    realEnd.mockImplementation(function (this: unknown) {
      order.push("end");
      return this;
    });
    const first = deferred();

    await runInRequestScope(async () => {
      gateResponseOnRequestScope(res);
      await waitUntil(
        first.promise.then(() => {
          order.push("first");
          // Register more background work from within a task.
          void waitUntil(
            Promise.resolve().then(() => void order.push("second")),
          );
        }),
      );
      res.end();
    });

    expect(realEnd).not.toHaveBeenCalled();
    first.resolve();
    await vi.waitFor(() => expect(realEnd).toHaveBeenCalled());
    expect(order).toEqual(["first", "second", "end"]);
  });
});
