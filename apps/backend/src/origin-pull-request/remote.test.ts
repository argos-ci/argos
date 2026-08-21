import { describe, expect, it } from "vitest";

import { parseOriginPullRequestData } from "./remote";

describe("parseOriginPullRequestData", () => {
  it("maps what Origin says about a pull request onto the row", () => {
    expect(
      parseOriginPullRequestData({
        id: "pr_01",
        number: 12,
        state: "closed",
        draft: false,
        merged: true,
        title: "Change home color",
        body: "",
        head: { ref: "refs/heads/feat/new-home", sha: "52f2b4b" },
        base: { ref: "main", sha: "b4196f1" },
        createdAt: "2026-08-18T09:00:00Z",
        closedAt: "2026-08-18T09:21:11Z",
        mergedAt: "2026-08-18T09:21:11Z",
      }),
    ).toEqual({
      originId: "pr_01",
      title: "Change home color",
      headRef: "feat/new-home",
      baseRef: "main",
      baseSha: "b4196f1",
      state: "closed",
      date: "2026-08-18T09:00:00Z",
      closedAt: "2026-08-18T09:21:11Z",
      mergedAt: "2026-08-18T09:21:11Z",
      merged: true,
      draft: false,
    });
  });

  it("truncates a title or branch that would not fit the column", () => {
    const parsed = parseOriginPullRequestData({
      id: "pr_01",
      number: 1,
      state: "open",
      draft: true,
      merged: false,
      title: "x".repeat(300),
      body: "",
      head: { ref: "y".repeat(300), sha: "" },
      base: { ref: "main", sha: "" },
    });
    expect(parsed.title).toHaveLength(255);
    expect(parsed.headRef).toHaveLength(255);
    expect(parsed.baseSha).toBeNull();
    expect(parsed.closedAt).toBeNull();
    expect(parsed.mergedAt).toBeNull();
    expect(parsed.date).toBeNull();
  });
});
