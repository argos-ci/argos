import path from "path";
import request from "supertest";
import fs from "fs/promises";
import { useDatabase, factory } from "@argos-ci/database/testing";
import { job as buildJob } from "@argos-ci/build";
import { Build } from "@argos-ci/database/models";
import { s3 } from "@argos-ci/storage";
import { quitRedis } from "./redis";
import { createApp } from "./app";
import axios from "axios";

jest.mock("@argos-ci/build-notification");

describe("api v2", () => {
  useDatabase();

  let app;

  beforeAll(async () => {
    app = await createApp();
    buildJob.push = jest.fn();
  });

  afterAll(async () => {
    await Promise.all([quitRedis(), s3().destroy()]);
  });

  describe("POST /v2/builds", () => {
    describe("with no valid token", () => {
      it("should respond 401", async () => {
        await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer nop")
          .expect((res) => {
            expect(res.body.error.message).toBe(
              `Repository not found (token: "nop")`
            );
          })
          .expect(401);
      });
    });

    describe("with repository not enabled", () => {
      beforeEach(async () => {
        await factory.create("Repository", {
          enabled: false,
          name: "my-repo",
          token: "awesome-token",
        });
      });

      it("should respond 403", async () => {
        await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .expect((res) => {
            expect(res.body.error.message).toBe(
              `Repository not enabled (name: "my-repo")`
            );
          })
          .expect(403);
      });
    });

    describe("with valid repository", () => {
      let ctx = {};

      beforeEach(async () => {
        const organization = await factory.create("Organization", {
          login: "argos-ci",
        });
        ctx.repository = await factory.create("Repository", {
          name: "argos",
          organizationId: organization.id,
          token: "awesome-token",
        });
      });

      it("creates build and upload urls", async () => {
        const res = await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: [
              "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
              "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            ],
            branch: "main",
            name: "current",
          })
          .expect(201);

        const build = await Build.query()
          .withGraphFetched("compareScreenshotBucket")
          .first();
        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.repositoryId).toBe(ctx.repository.id);
        expect(build.externalId).toBe(null);
        expect(build.batchCount).toBe(null);
        expect(build.compareScreenshotBucket.complete).toBe(false);
        expect(build.compareScreenshotBucket.name).toBe("current");
        expect(build.compareScreenshotBucket.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0"
        );
        expect(build.compareScreenshotBucket.branch).toBe("main");
        expect(build.compareScreenshotBucket.repositoryId).toBe(
          ctx.repository.id
        );

        expect(res.body).toMatchObject({
          build: {
            id: build.id,
            url: await build.getUrl(),
          },
          screenshots: [
            {
              key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
              putUrl: expect.any(String),
            },
            {
              key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
              putUrl: expect.any(String),
            },
          ],
        });
      });
    });

    describe("complete workflow — single", () => {
      let ctx = {};

      beforeEach(async () => {
        const organization = await factory.create("Organization", {
          login: "argos-ci",
        });
        ctx.repository = await factory.create("Repository", {
          name: "argos",
          organizationId: organization.id,
          token: "awesome-token",
        });
      });

      it("create a complete build", async () => {
        const screenshots = [
          {
            key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            name: "first",
            path: path.join(__dirname, "__fixtures__", "screenshot_test.jpg"),
          },
          {
            key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            name: "second",
            path: path.join(__dirname, "__fixtures__", "screenshot_test_2.jpg"),
          },
          {
            key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            name: "second-twin",
            path: path.join(__dirname, "__fixtures__", "screenshot_test_2.jpg"),
          },
        ];
        const createResult = await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: Array.from(
              new Set(screenshots.map((screenshot) => screenshot.key))
            ),
            branch: "main",
            name: "current",
          })
          .expect(201);

        // Upload screenshots
        await Promise.all(
          createResult.body.screenshots.map(async (resScreenshot) => {
            const path = screenshots.find(
              (s) => s.key === resScreenshot.key
            ).path;
            const file = await fs.readFile(path);

            const axiosResponse = await axios({
              method: "PUT",
              url: resScreenshot.putUrl,
              data: file,
              headers: {
                "Content-Type": "image/jpeg",
              },
            });

            expect(axiosResponse.status).toBe(200);
          })
        );

        const updateResult = await request(app)
          .put(`/v2/builds/${createResult.body.build.id}`)
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            screenshots: screenshots.map((screenshot) => ({
              key: screenshot.key,
              name: screenshot.name,
            })),
          })
          .expect(200);

        const build = await Build.query()
          .withGraphFetched("compareScreenshotBucket.screenshots.file")
          .first();
        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.repositoryId).toBe(ctx.repository.id);
        expect(build.externalId).toBe(null);
        expect(build.batchCount).toBe(null);
        expect(
          build.compareScreenshotBucket.screenshots.map((s) => ({
            s3Id: s.s3Id,
            name: s.name,
          }))
        ).toEqual(
          screenshots.map((screenshot) => ({
            s3Id: screenshot.key,
            name: screenshot.name,
          }))
        );
        expect(build.compareScreenshotBucket.complete).toBe(true);
        expect(build.compareScreenshotBucket.name).toBe("current");
        expect(build.compareScreenshotBucket.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0"
        );
        expect(build.compareScreenshotBucket.branch).toBe("main");
        expect(build.compareScreenshotBucket.repositoryId).toBe(
          ctx.repository.id
        );

        expect(updateResult.body).toEqual({
          build: {
            id: build.id,
            url: await build.getUrl(),
          },
        });
      });
    });

    describe("complete workflow — parallel", () => {
      let ctx = {};

      beforeEach(async () => {
        const organization = await factory.create("Organization", {
          login: "argos-ci",
        });
        ctx.repository = await factory.create("Repository", {
          name: "argos",
          organizationId: organization.id,
          token: "awesome-token",
        });
      });

      it("create a complete build", async () => {
        const screenshotGroups = [
          [
            {
              key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
              name: "first",
              path: path.join(__dirname, "__fixtures__", "screenshot_test.jpg"),
            },
          ],
          [
            {
              key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
              name: "second",
              path: path.join(
                __dirname,
                "__fixtures__",
                "screenshot_test_2.jpg"
              ),
            },
          ],
        ];

        const updateResults = await Promise.all(
          screenshotGroups.map(async (screenshots) => {
            const createResult = await request(app)
              .post("/v2/builds")
              .set("Host", "api.argos-ci.dev")
              .set("Authorization", "Bearer awesome-token")
              .send({
                commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
                screenshotKeys: screenshots.map((screenshot) => screenshot.key),
                branch: "main",
                name: "current",
                parallel: true,
                parallelNonce: "unique-build-id",
              })
              .expect(201);

            // Upload screenshots
            await Promise.all(
              createResult.body.screenshots.map(async (resScreenshot) => {
                const path = screenshots.find(
                  (s) => s.key === resScreenshot.key
                ).path;
                const file = await fs.readFile(path);

                const axiosResponse = await axios({
                  method: "PUT",
                  url: resScreenshot.putUrl,
                  data: file,
                  headers: {
                    "Content-Type": "image/jpeg",
                  },
                });

                expect(axiosResponse.status).toBe(200);
              })
            );

            const updateResult = await request(app)
              .put(`/v2/builds/${createResult.body.build.id}`)
              .set("Host", "api.argos-ci.dev")
              .set("Authorization", "Bearer awesome-token")
              .send({
                screenshots: screenshots.map((screenshot) => ({
                  key: screenshot.key,
                  name: screenshot.name,
                })),
                parallel: true,
                parallelTotal: 2,
              })
              .expect(200);

            return updateResult;
          })
        );

        const updateBodies = updateResults.map(
          (updateResult) => updateResult.body
        );

        const build = await Build.query()
          .withGraphFetched("compareScreenshotBucket.screenshots.file")
          .first();
        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.repositoryId).toBe(ctx.repository.id);
        expect(build.externalId).toBe("unique-build-id");
        expect(build.batchCount).toBe(2);

        expect(
          build.compareScreenshotBucket.screenshots.map((s) => ({
            s3Id: s.s3Id,
            name: s.name,
          }))
        ).toEqual(
          expect.arrayContaining(
            screenshotGroups.flat().map((screenshot) => ({
              s3Id: screenshot.key,
              name: screenshot.name,
            }))
          )
        );
        expect(build.compareScreenshotBucket.complete).toBe(true);
        expect(build.compareScreenshotBucket.name).toBe("current");
        expect(build.compareScreenshotBucket.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0"
        );
        expect(build.compareScreenshotBucket.branch).toBe("main");
        expect(build.compareScreenshotBucket.repositoryId).toBe(
          ctx.repository.id
        );

        const buildUrl = await build.getUrl();

        updateBodies.forEach((body) => {
          expect(body).toEqual({
            build: {
              id: build.id,
              url: buildUrl,
            },
          });
        });
      });
    });
  });
});
