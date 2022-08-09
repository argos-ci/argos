import path from "path";
import request from "supertest";
import { usePlayback } from "@argos-ci/github/testing";
import { useDatabase, factory } from "@argos-ci/database/testing";
import { job as buildJob } from "@argos-ci/build";
import * as notifications from "@argos-ci/build-notification";
import { quitRedis } from "./redis";
import app from "./app";

describe("app routes", () => {
  useDatabase();

  beforeAll(() => {
    buildJob.push = jest.fn();
  });

  afterAll(quitRedis);

  describe("POST /builds", () => {
    const token = "xx";

    describe("with no valid token", () => {
      it("should respond bad request", async () => {
        await request(app)
          .post("/builds")
          .set("Host", "api.argos-ci.dev")
          .attach(
            "screenshots[]",
            path.join(__dirname, "__fixtures__/screenshot_test.jpg")
          )
          .field(
            "data",
            JSON.stringify({
              commit: "test-commit",
              branch: "test-branch",
              names: ["screenshot_test.jpg"],
            })
          )
          .expect((res) => {
            expect(res.body.error.message).toBe("Missing token");
          })
          .expect(401);
      });
    });

    describe("with no corresponding repository", () => {
      it("should respond bad request", async () => {
        await request(app)
          .post("/builds")
          .set("Host", "api.argos-ci.dev")
          .attach(
            "screenshots[]",
            path.join(__dirname, "__fixtures__/screenshot_test.jpg")
          )
          .field(
            "data",
            JSON.stringify({
              commit: "test-commit",
              branch: "test-branch",
              token,
              names: ["screenshot_test.jpg"],
            })
          )
          .expect((res) => {
            expect(res.body.error.message).toBe(
              'Repository not found (token: "xx")'
            );
          })
          .expect(400);
      });
    });

    describe("with repository not enabled", () => {
      it("should respond bad request", async () => {
        await factory.create("Repository", {
          enabled: false,
          name: "foo",
          token,
        });

        await request(app)
          .post("/builds")
          .set("Host", "api.argos-ci.dev")
          .attach(
            "screenshots[]",
            path.join(__dirname, "__fixtures__/screenshot_test.jpg")
          )
          .field(
            "data",
            JSON.stringify({
              commit: "test-commit",
              branch: "test-branch",
              token,
              names: ["screenshot_test.jpg"],
            })
          )
          .expect((res) => {
            expect(res.body.error.message).toBe(
              'Repository not enabled (name: "foo")'
            );
          })
          .expect(400);
      });
    });

    describe("with valid repository", () => {
      beforeAll(() => {
        notifications.pushBuildNotification = jest.fn();
      });

      usePlayback({
        fixtures: path.join(__dirname, "__fixtures__"),
        name: "api.builds.json",
        mode: "dryrun",
        // mode: 'record',
      });

      it("should upload screenshots, update database and return result", async () => {
        const accessToken = "yyy";
        const organization = await factory.create("Organization", {
          login: "callemall",
        });
        const user = await factory.create("User", {
          accessToken,
        });
        let repository = await factory.create("Repository", {
          name: "material-ui",
          organizationId: organization.id,
          token,
        });
        await factory.create("UserRepositoryRight", {
          userId: user.id,
          repositoryId: repository.id,
        });

        const name = "chrome/screenshot_test.jpg";
        const res = await request(app)
          .post("/builds")
          .set("Host", "api.argos-ci.dev")
          .attach(
            "screenshots[]",
            path.join(__dirname, "__fixtures__/screenshot_test.jpg")
          )
          .field(
            "data",
            JSON.stringify({
              commit: "7abbb0e131ec5b3f6ab8e54a25b047705a013864",
              branch: "related-scrollable-tabs",
              token,
              names: [name],
            })
          )
          .expect(200);

        repository = await repository
          .$query()
          .withGraphFetched("[builds.compareScreenshotBucket.screenshots]");
        expect(res.body.build.id).not.toBe(undefined);
        expect(res.body.build.repository).toBe(undefined); // Not leaking private data
        expect(res.body.build).toMatchObject({
          jobStatus: "pending",
          number: 1,
          repositoryId: repository.id,
          buildUrl: `http://app.test.argos-ci.com/callemall/material-ui/builds/${res.body.build.number}`,
        });
        expect(
          repository.builds[0].compareScreenshotBucket.screenshots[0].name
        ).toBe(name);
      });

      it("should upload screenshots, update database and return result, with an external id", async () => {
        const accessToken = "yyy";
        const organization = await factory.create("Organization", {
          login: "callemall",
        });
        const user = await factory.create("User", {
          accessToken,
        });
        let repository = await factory.create("Repository", {
          name: "material-ui",
          organizationId: organization.id,
          token,
        });
        await factory.create("UserRepositoryRight", {
          userId: user.id,
          repositoryId: repository.id,
        });

        const name = "chrome/screenshot_test.jpg";
        const res = await request(app)
          .post("/builds")
          .set("Host", "api.dev.argos-ci.com")
          .attach(
            "screenshots[]",
            path.join(__dirname, "__fixtures__/screenshot_test.jpg")
          )
          .field(
            "data",
            JSON.stringify({
              commit: "7abbb0e131ec5b3f6ab8e54a25b047705a013864",
              branch: "related-scrollable-tabs",
              externalBuildId: "foobar",
              batchCount: 2,
              token,
              names: [name],
            })
          )
          .expect(200);

        repository = await repository
          .$query()
          .withGraphFetched("[builds.compareScreenshotBucket.screenshots]");
        expect(res.body.build.id).not.toBe(undefined);
        expect(res.body.build.repository).toBe(undefined); // Not leaking private data
        expect(res.body.build).toMatchObject({
          jobStatus: "pending",
          number: 1,
          repositoryId: repository.id,
          batchCount: 1,
          externalId: "foobar",
          buildUrl: `http://app.test.argos-ci.com/callemall/material-ui/builds/${res.body.build.number}`,
        });
        expect(
          repository.builds[0].compareScreenshotBucket.screenshots[0].name
        ).toBe(name);

        // Second call to complete the batch.
        const res2 = await request(app)
          .post("/builds")
          .set("Host", "api.dev.argos-ci.com")
          .attach(
            "screenshots[]",
            path.join(__dirname, "__fixtures__/screenshot_test.jpg")
          )
          .field(
            "data",
            JSON.stringify({
              commit: "7abbb0e131ec5b3f6ab8e54a25b047705a013864",
              branch: "related-scrollable-tabs",
              externalBuildId: "foobar",
              batchCount: 2,
              token,
              names: [name],
            })
          )
          .expect(200);
        expect(res2.body.build.id).toBe(res.body.build.id);
        expect(res2.body.build.externalId).toBe("foobar");
        expect(res2.body.build.batchCount).toBe(2);
      });
    });
  });

  describe("GET /buckets", () => {
    let repository;

    beforeEach(async () => {
      repository = await factory.create("Repository");

      await factory.create("ScreenshotBucket", {
        name: "test-bucket",
        commit: "test-commit",
        branch: "test-branch",
        repositoryId: repository.id,
      });
    });

    it("should returns buckets", () =>
      request(app)
        .get("/buckets")
        .set("Host", "api.argos-ci.dev")
        .expect((res) => {
          expect(res.body[0].name).toBe("test-bucket");
          expect(res.body[0].commit).toBe("test-commit");
          expect(res.body[0].branch).toBe("test-branch");
          expect(res.body[0].repositoryId).toBe(repository.id);
        })
        .expect(200));

    describe("with query.branch", () => {
      it("should filter by branch", async () => {
        await request(app)
          .get("/buckets?branch=whatever")
          .set("Host", "api.argos-ci.dev")
          .expect((res) => {
            expect(res.body).toHaveLength(0);
          })
          .expect(200);

        await request(app)
          .get("/buckets?branch=test-branch")
          .set("Host", "api.argos-ci.dev")
          .expect((res) => {
            expect(res.body).toHaveLength(1);
          })
          .expect(200);
      });
    });
  });
});
