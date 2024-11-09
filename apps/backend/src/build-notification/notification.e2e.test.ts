import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { concludeBuild } from "@/build/concludeBuild.js";
import { Build } from "@/database/models/Build.js";
import { BuildNotification } from "@/database/models/BuildNotification.js";
import { factory } from "@/database/testing/index.js";
import { setupDatabase } from "@/database/testing/util.js";

import { getNotificationPayload } from "./notification.js";

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
});
