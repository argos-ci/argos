import { RequestError } from "@octokit/request-error";
import type { Octokit } from "@octokit/rest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGhRepositoryDispatch } from "./repository-dispatch";

function makeRequestError(status: number): RequestError {
  return new RequestError("err", status, {
    request: { method: "POST", url: "/", headers: {} },
  });
}

describe("createGhRepositoryDispatch", () => {
  const createDispatchEvent = vi.fn();
  const octokit = {
    repos: { createDispatchEvent },
  } as unknown as Octokit;

  beforeEach(() => {
    createDispatchEvent.mockReset();
  });

  it("forwards the call to Octokit", async () => {
    await createGhRepositoryDispatch(octokit, {
      owner: "argos-ci",
      repo: "argos",
      event_type: "argos.build.diff-detected",
      client_payload: { foo: "bar" },
    });
    expect(createDispatchEvent).toHaveBeenCalledWith({
      owner: "argos-ci",
      repo: "argos",
      event_type: "argos.build.diff-detected",
      client_payload: { foo: "bar" },
    });
  });

  it("swallows 404 errors (repo deleted or transferred)", async () => {
    createDispatchEvent.mockRejectedValueOnce(makeRequestError(404));
    await expect(
      createGhRepositoryDispatch(octokit, {
        owner: "argos-ci",
        repo: "argos",
        event_type: "argos.build.diff-detected",
      }),
    ).resolves.toBeUndefined();
  });

  it("swallows 403 errors (archived repo or missing permission)", async () => {
    createDispatchEvent.mockRejectedValueOnce(makeRequestError(403));
    await expect(
      createGhRepositoryDispatch(octokit, {
        owner: "argos-ci",
        repo: "argos",
        event_type: "argos.build.diff-detected",
      }),
    ).resolves.toBeUndefined();
  });

  it("does not throw on unexpected errors", async () => {
    createDispatchEvent.mockRejectedValueOnce(makeRequestError(500));
    await expect(
      createGhRepositoryDispatch(octokit, {
        owner: "argos-ci",
        repo: "argos",
        event_type: "argos.build.diff-detected",
      }),
    ).resolves.toBeUndefined();
  });
});
