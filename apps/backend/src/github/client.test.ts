import { invariant } from "@argos/util/invariant";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { failUnhandledExceptLoopback } from "@/web/test-util";

import { getTokenOctokit } from "./client";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: failUnhandledExceptLoopback });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

type Answer = () => Response;

const found: Answer = () => HttpResponse.json({ id: 1 });
const failWith =
  (status: number): Answer =>
  () =>
    HttpResponse.json({ message: "GitHub error" }, { status });
const dropConnection: Answer = () => HttpResponse.error();

/**
 * Answer the repository lookup with `answers` in turn, repeating the last one.
 * Returns the requests GitHub received.
 */
function stubRepository(answers: Answer[]) {
  const received = { count: 0 };
  server.use(
    http.get("https://api.github.com/repos/acme/web", () => {
      const answer = answers[Math.min(received.count, answers.length - 1)];
      invariant(answer, "No answer stubbed");
      received.count += 1;
      return answer();
    }),
  );
  return received;
}

function getRepository() {
  const octokit = getTokenOctokit({ token: "ghs_token", proxy: false });
  return octokit.repos.get({ owner: "acme", repo: "web" });
}

describe("GitHub requests", () => {
  it.each([
    ["a server error", failWith(503)],
    ["a dropped connection", dropConnection],
  ])("are retried after %s", async (_, failure) => {
    const received = stubRepository([failure, failure, found]);
    await expect(getRepository()).resolves.toMatchObject({ data: { id: 1 } });
    expect(received.count).toBe(3);
  });

  it("fail after three retries", async () => {
    const received = stubRepository([failWith(502)]);
    await expect(getRepository()).rejects.toMatchObject({ status: 502 });
    expect(received.count).toBe(4);
  });

  it.each([401, 403, 404, 409, 422])(
    "return a %i without retrying",
    async (status) => {
      const received = stubRepository([failWith(status)]);
      await expect(getRepository()).rejects.toMatchObject({ status });
      expect(received.count).toBe(1);
    },
  );
});
