import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createBuild } from "./createBuild";

describe("build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("createBuild", () => {
    let project: Project;

    beforeEach(async () => {
      const plan = await factory.Plan.create({});
      const account = await factory.TeamAccount.create({
        forcedPlanId: plan.id,
      });
      project = await factory.Project.create({
        accountId: account.id,
        githubRepositoryId: null,
      });
    });

    it("creates a build", async () => {
      const build = await createBuild({
        project,
        prHeadCommit: null,
        prNumber: null,
        argosSdk: "@argos-ci/core@3.2.0",
        baseBranch: "develop",
        baseCommit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        branch: "develop",
        runAttempt: null,
        runId: null,
        ciProvider: "github-actions",
        mode: "monitoring",
        buildName: null,
        parallel: { nonce: "15292349583-1" },
        parentCommits: [
          "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
          "2c3f6f060a936d915126bfed1a228e6fe59dfd3e",
          "42c96859db7b13177b0d70e4e42d10c8470de30e",
        ],
        skipped: null,
        mergeQueue: false,
        subset: false,
      });

      expect(build.baseBranch).toBe("develop");
      expect(build.parentCommits).toEqual([
        "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        "2c3f6f060a936d915126bfed1a228e6fe59dfd3e",
        "42c96859db7b13177b0d70e4e42d10c8470de30e",
      ]);
    });
  });
});
