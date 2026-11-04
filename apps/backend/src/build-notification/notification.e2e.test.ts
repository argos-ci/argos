import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { concludeBuild } from "@/build/concludeBuild";
import { Build } from "@/database/models/Build";
import { BuildNotification } from "@/database/models/BuildNotification";
import type { Project } from "@/database/models/Project";
import { factory } from "@/database/testing";
import { setupDatabase } from "@/database/testing/util";

import { getNotificationPayload } from "./notification";

describe("#getNotificationPayload", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("with a repository only linked to one project", () => {
    let build: Build;
    let buildNotification: BuildNotification;

    beforeEach(async () => {
      const repository = await factory.GithubRepository.create();
      const [project] = await factory.Project.createMany(2, [
        {
          githubRepositoryId: repository.id,
          gitlabProjectId: null,
          name: "backend",
        },
        {
          githubRepositoryId: null,
          gitlabProjectId: null,
          name: "frontend",
        },
      ]);
      invariant(project);
      build = await factory.Build.create({ projectId: project.id });
      buildNotification = await factory.BuildNotification.create({
        buildId: build.id,
      });
      await concludeBuild({ build, notify: false });
      build = await build.$query();
    });

    it("returns argos as context", async () => {
      const payload = await getNotificationPayload({
        build,
        buildNotification,
      });
      expect(payload.context).toBe("argos");
    });
  });

  describe("with a GitHub repository linked to multiple projects", () => {
    let build: Build;
    let buildNotification: BuildNotification;

    beforeEach(async () => {
      const repository = await factory.GithubRepository.create();
      const [project] = await factory.Project.createMany(2, [
        {
          githubRepositoryId: repository.id,
          gitlabProjectId: null,
          name: "backend",
        },
        {
          githubRepositoryId: repository.id,
          gitlabProjectId: null,
          name: "frontend",
        },
      ]);
      invariant(project);
      build = await factory.Build.create({ projectId: project.id });
      buildNotification = await factory.BuildNotification.create({
        buildId: build.id,
      });
      await concludeBuild({ build, notify: false });
      build = await build.$query();
    });

    it("returns argos as context", async () => {
      const payload = await getNotificationPayload({
        build,
        buildNotification,
      });
      expect(payload.context).toBe("argos/backend");
    });
  });

  describe("with changes awaiting review", () => {
    async function getAwaitingReviewPayload(
      awaitingReviewStatus?: Project["awaitingReviewStatus"],
    ) {
      const project = await factory.Project.create(
        awaitingReviewStatus ? { awaitingReviewStatus } : {},
      );
      const build = await factory.Build.create({ projectId: project.id });
      return getNotificationPayload({
        build,
        buildNotification: { type: "diff-detected" },
      });
    }

    it("reports a failure by default", async () => {
      const payload = await getAwaitingReviewPayload();
      expect(payload.github.state).toBe("failure");
      expect(payload.gitlab.state).toBe("failed");
      expect(payload.origin).toEqual({
        status: "completed",
        conclusion: "failure",
      });
    });

    it("reports a pending status when the project asks for it", async () => {
      const payload = await getAwaitingReviewPayload("pending");
      expect(payload.github.state).toBe("pending");
      expect(payload.gitlab.state).toBe("running");
      expect(payload.origin).toEqual({
        status: "in_progress",
        conclusion: null,
      });
    });
  });
});
