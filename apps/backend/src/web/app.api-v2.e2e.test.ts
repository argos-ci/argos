import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import z from "zod";

import { Build, BuildShard, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { quitAmqp } from "@/job-core";
import { getS3Client } from "@/storage";
import { setupRedis } from "@/util/redis/testing";

import { createApp } from "./app";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

type UploadEntry = {
  key: string;
  url: string;
  fields: Record<string, string>;
};

/**
 * Upload a file using the presigned POST policy returned by createBuild.
 *
 * S3 enforces the size limit baked into the policy's `content-length-range`
 * condition; oversized uploads are rejected by S3 itself, not by Argos.
 */
async function uploadFile(
  upload: UploadEntry,
  file: Buffer,
  contentType: string,
): Promise<void> {
  const formData = new FormData();
  for (const [name, value] of Object.entries(upload.fields)) {
    formData.append(name, value);
  }
  // The `file` field must come after every policy field and must be the last
  // entry in the form. We don't set a `Content-Type` form field because the
  // policy doesn't condition it (S3 would 403 on any unconditioned field).
  formData.append(
    "file",
    new Blob([new Uint8Array(file)], { type: contentType }),
  );
  const response = await fetch(upload.url, {
    method: "POST",
    body: formData,
  });
  expect(response.status).toBe(204);
}

describe("api v2", () => {
  let app: Express;

  setupRedis();

  beforeAll(async () => {
    z.globalRegistry.clear();
    app = await createApp();
  });

  afterAll(async () => {
    await Promise.all([getS3Client().destroy(), quitAmqp()]);
  });

  beforeEach(async () => {
    await setupDatabase();
  });

  describe("POST /v2/builds", () => {
    describe("with no valid token", () => {
      it("should respond 401", async () => {
        await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer nop")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: [
              "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
              "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            ],
            branch: "main",
            name: "current",
            prNumber: 12,
            mode: null,
          })
          .expect((res) => {
            expect(res.body.error).toBe(
              `Project not found in Argos. If the issue persists, verify your token. (token: "nop").`,
            );
          })
          .expect(401);
      });
    });

    describe("with valid project", () => {
      let project: Project;

      beforeEach(async () => {
        const account = await factory.TeamAccount.create({
          slug: "argos-ci",
        });
        await factory.Subscription.create({ accountId: account.id });
        project = await factory.Project.create({
          name: "argos",
          accountId: account.id,
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
            prNumber: 12,
            mode: null,
          })
          .expect(201);

        const build = await Build.query()
          .withGraphFetched("compareScreenshotBucket")
          .first()
          .throwIfNotFound();

        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.projectId).toBe(project.id);
        expect(build.externalId).toBe(null);
        expect(build.batchCount).toBe(null);
        expect(build.compareScreenshotBucket!.complete).toBe(false);
        expect(build.compareScreenshotBucket!.name).toBe("current");
        expect(build.compareScreenshotBucket!.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
        );
        expect(build.compareScreenshotBucket!.branch).toBe("main");
        expect(build.compareScreenshotBucket!.projectId).toBe(project.id);

        expect(res.body).toMatchObject({
          build: {
            id: build.id,
            url: "http://localhost:3000/argos-ci/argos/builds/1",
            number: 1,
            head: {
              sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
              branch: "main",
            },
            base: null,
            status: "pending",
            notification: {
              context: "argos/current",
              description: "Build is queued",
              github: { state: "pending" },
              gitlab: { state: "pending" },
            },
          },
          screenshots: [
            {
              key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
              url: expect.any(String),
              fields: expect.any(Object),
            },
            {
              key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
              url: expect.any(String),
              fields: expect.any(Object),
            },
          ],
        });
      });
    });

    describe("complete workflow — single", () => {
      let project: Project;

      beforeEach(async () => {
        const account = await factory.TeamAccount.create({
          slug: "argos-ci",
        });
        await factory.Subscription.create({ accountId: account.id });
        project = await factory.Project.create({
          name: "argos",
          accountId: account.id,
          token: "awesome-token",
        });
      });

      it("create a complete build", async () => {
        const screenshots = [
          {
            key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            name: "first",
            baseName: "first-base",
            threshold: 0.3,
            path: join(__dirname, "__fixtures__", "screenshot_test.jpg"),
          },
          {
            key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            name: "second",
            path: join(__dirname, "__fixtures__", "screenshot_test_2.jpg"),
            metadata: {
              $schema: "https://api.argos-ci.com/v2/screenshot-metadata.json",
              url: "https://localhost:3000/test",
              viewport: { width: 1024, height: 768 },
              colorScheme: "light",
              mediaType: "screen",
              browser: { name: "chromium", version: "119.0.6045.9" },
              automationLibrary: { name: "playwright", version: "1.39.0" },
              sdk: { name: "@argos-ci/playwright", version: "0.0.7" },
              story: { id: "components-button--primary", tags: ["autodocs"] },
            },
          },
          {
            key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            name: "second-twin",
            path: join(__dirname, "__fixtures__", "screenshot_test_2.jpg"),
          },
        ];
        const createResult = await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: Array.from(
              new Set(screenshots.map((screenshot) => screenshot.key)),
            ),
            branch: "main",
            name: "current",
          })
          .expect(201);

        // Upload screenshots
        await Promise.all(
          createResult.body.screenshots.map(
            async (resScreenshot: UploadEntry) => {
              const path = screenshots.find(
                (s) => s.key === resScreenshot.key,
              )!.path;
              const file = await readFile(path);

              await uploadFile(resScreenshot, file, "image/jpeg");
            },
          ),
        );

        const updateResult = await request(app)
          .put(`/v2/builds/${createResult.body.build.id}`)
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            screenshots: screenshots.map((screenshot) => ({
              key: screenshot.key,
              name: screenshot.name,
              metadata: screenshot.metadata,
              threshold: screenshot.threshold,
              baseName: screenshot.baseName ?? null,
            })),
          });

        expect(updateResult.statusCode).toBe(200);

        const build = await Build.query()
          .withGraphFetched("compareScreenshotBucket.screenshots.file")
          .first()
          .throwIfNotFound();

        const firstScreenshot = build.compareScreenshotBucket!.screenshots![0]!;
        expect(firstScreenshot.threshold).toBe(0.3);
        expect(firstScreenshot.baseName).toBe("first-base");

        const screenshotWithMetadata =
          build.compareScreenshotBucket!.screenshots!.find(
            (screenshot) => screenshot.name === "second",
          );
        expect(screenshotWithMetadata!.metadata).toEqual({
          $schema: "https://api.argos-ci.com/v2/screenshot-metadata.json",
          url: "https://localhost:3000/test",
          viewport: { width: 1024, height: 768 },
          colorScheme: "light",
          mediaType: "screen",
          browser: { name: "chromium", version: "119.0.6045.9" },
          automationLibrary: { name: "playwright", version: "1.39.0" },
          sdk: { name: "@argos-ci/playwright", version: "0.0.7" },
          story: { id: "components-button--primary", tags: ["autodocs"] },
        });

        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.projectId).toBe(project.id);
        expect(build.externalId).toBe(null);
        expect(build.batchCount).toBe(null);
        expect(build.mode).toBe("ci");
        expect(
          build.compareScreenshotBucket!.screenshots!.map((s) => ({
            s3Id: s.s3Id,
            name: s.name,
          })),
        ).toEqual(
          screenshots.map((screenshot) => ({
            s3Id: screenshot.key,
            name: screenshot.name,
          })),
        );
        expect(build.compareScreenshotBucket!.complete).toBe(true);
        expect(build.compareScreenshotBucket!.name).toBe("current");
        expect(build.compareScreenshotBucket!.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
        );
        expect(build.compareScreenshotBucket!.branch).toBe("main");
        expect(build.compareScreenshotBucket!.projectId).toBe(project.id);

        expect(updateResult.body).toEqual({
          build: {
            id: build.id,
            head: {
              sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
              branch: "main",
            },
            base: null,
            metadata: null,
            stats: null,
            conclusion: null,
            url: "http://localhost:3000/argos-ci/argos/builds/1",
            number: 1,
            status: "pending",
            notification: {
              context: "argos/current",
              description: "Build is queued",
              github: { state: "pending" },
              gitlab: { state: "pending" },
              url: "http://localhost:3000/argos-ci/argos/builds/1",
            },
          },
        });
      });

      it("create a complete monitoring build", async () => {
        const screenshots = [
          {
            key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            name: "first",
            path: join(__dirname, "__fixtures__", "screenshot_test.jpg"),
          },
        ];
        const createResult = await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: Array.from(
              new Set(screenshots.map((screenshot) => screenshot.key)),
            ),
            branch: "main",
            name: "current",
            mode: "monitoring",
          })
          .expect(201);

        // Upload screenshots
        await Promise.all(
          createResult.body.screenshots.map(
            async (resScreenshot: UploadEntry) => {
              const path = screenshots.find(
                (s) => s.key === resScreenshot.key,
              )!.path;
              const file = await readFile(path);

              await uploadFile(resScreenshot, file, "image/jpeg");
            },
          ),
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
          .first()
          .throwIfNotFound();

        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.projectId).toBe(project.id);
        expect(build.externalId).toBe(null);
        expect(build.batchCount).toBe(null);
        expect(build.mode).toBe("monitoring");
        expect(
          build.compareScreenshotBucket!.screenshots!.map((s) => ({
            s3Id: s.s3Id,
            name: s.name,
          })),
        ).toEqual(
          screenshots.map((screenshot) => ({
            s3Id: screenshot.key,
            name: screenshot.name,
          })),
        );
        expect(build.compareScreenshotBucket!.complete).toBe(true);
        expect(build.compareScreenshotBucket!.name).toBe("current");
        expect(build.compareScreenshotBucket!.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
        );
        expect(build.compareScreenshotBucket!.branch).toBe("main");
        expect(build.compareScreenshotBucket!.projectId).toBe(project.id);

        expect(updateResult.body).toEqual({
          build: {
            id: build.id,
            head: {
              sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
              branch: "main",
            },
            base: null,
            metadata: null,
            stats: null,
            conclusion: null,
            url: "http://localhost:3000/argos-ci/argos/builds/1",
            number: 1,
            status: "pending",
            notification: {
              context: "argos/current",
              description: "Build is queued",
              github: { state: "pending" },
              gitlab: { state: "pending" },
              url: "http://localhost:3000/argos-ci/argos/builds/1",
            },
          },
        });
      });
    });

    describe("complete workflow — parallel", () => {
      let project: Project;

      const screenshotGroups = [
        [
          {
            key: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            name: "first",
            path: join(__dirname, "__fixtures__", "screenshot_test.jpg"),
          },
        ],
        [
          {
            key: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
            name: "second",
            path: join(__dirname, "__fixtures__", "screenshot_test_2.jpg"),
          },
        ],
      ];

      beforeEach(async () => {
        const account = await factory.TeamAccount.create({
          slug: "argos-ci",
        });
        await factory.Subscription.create({ accountId: account.id });
        project = await factory.Project.create({
          name: "argos",
          accountId: account.id,
          token: "awesome-token",
        });
      });

      it("create a complete build", async () => {
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
              createResult.body.screenshots.map(
                async (resScreenshot: UploadEntry) => {
                  const path = screenshots.find(
                    (s) => s.key === resScreenshot.key,
                  )!.path;
                  const file = await readFile(path);

                  await uploadFile(resScreenshot, file, "image/jpeg");
                },
              ),
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
          }),
        );

        const updateBodies = updateResults.map(
          (updateResult) => updateResult.body,
        );

        const build = await Build.query()
          .withGraphFetched("compareScreenshotBucket.screenshots.file")
          .first()
          .throwIfNotFound();

        expect(build.jobStatus).toBe("pending");
        expect(build.name).toBe("current");
        expect(build.projectId).toBe(project.id);
        expect(build.externalId).toBe("unique-build-id");
        expect(build.batchCount).toBe(2);
        expect(build.totalBatch).toBe(2);

        expect(
          build.compareScreenshotBucket!.screenshots!.map((s) => ({
            s3Id: s.s3Id,
            name: s.name,
          })),
        ).toEqual(
          expect.arrayContaining(
            screenshotGroups.flat().map((screenshot) => ({
              s3Id: screenshot.key,
              name: screenshot.name,
            })),
          ),
        );
        expect(build.compareScreenshotBucket!.complete).toBe(true);
        expect(build.compareScreenshotBucket!.name).toBe("current");
        expect(build.compareScreenshotBucket!.commit).toBe(
          "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
        );
        expect(build.compareScreenshotBucket!.branch).toBe("main");
        expect(build.compareScreenshotBucket!.projectId).toBe(project.id);

        updateBodies.forEach((body) => {
          expect(body).toEqual({
            build: {
              id: build.id,
              head: {
                sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
                branch: "main",
              },
              base: null,
              metadata: null,
              stats: null,
              conclusion: null,
              url: "http://localhost:3000/argos-ci/argos/builds/1",
              number: 1,
              status: "pending",
              notification: {
                context: "argos/current",
                description: "Build is queued",
                github: { state: "pending" },
                gitlab: { state: "pending" },
                url: "http://localhost:3000/argos-ci/argos/builds/1",
              },
            },
          });
        });
      });

      it("ignores a retried shard with the same request id", async () => {
        const createFirstShard = await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: screenshotGroups[0]!.map(
              (screenshot) => screenshot.key,
            ),
            branch: "main",
            name: "current",
            parallel: true,
            parallelNonce: "retried-build-id",
          })
          .expect(201);

        for (const resScreenshot of createFirstShard.body
          .screenshots as UploadEntry[]) {
          const screenshot = screenshotGroups[0]!.find(
            (candidate) => candidate.key === resScreenshot.key,
          );
          expect(screenshot).toBeDefined();
          const file = await readFile(screenshot!.path);
          await uploadFile(resScreenshot, file, "image/jpeg");
        }

        await request(app)
          .put(`/v2/builds/${createFirstShard.body.build.id}`)
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .set("x-argos-request-id", "shard-1")
          .send({
            screenshots: screenshotGroups[0]!.map((screenshot) => ({
              key: screenshot.key,
              name: screenshot.name,
            })),
            parallel: true,
            parallelTotal: 2,
          })
          .expect(200);

        await request(app)
          .put(`/v2/builds/${createFirstShard.body.build.id}`)
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .set("x-argos-request-id", "shard-1")
          .send({
            screenshots: screenshotGroups[0]!.map((screenshot) => ({
              key: screenshot.key,
              name: screenshot.name,
            })),
            parallel: true,
            parallelTotal: 2,
          })
          .expect(200);

        let build = await Build.query()
          .findById(createFirstShard.body.build.id)
          .withGraphFetched("compareScreenshotBucket")
          .throwIfNotFound();

        expect(build.batchCount).toBe(1);
        expect(build.compareScreenshotBucket!.complete).toBe(false);

        const createSecondShard = await request(app)
          .post("/v2/builds")
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .send({
            commit: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
            screenshotKeys: screenshotGroups[1]!.map(
              (screenshot) => screenshot.key,
            ),
            branch: "main",
            name: "current",
            parallel: true,
            parallelNonce: "retried-build-id",
          })
          .expect(201);

        for (const resScreenshot of createSecondShard.body
          .screenshots as UploadEntry[]) {
          const screenshot = screenshotGroups[1]!.find(
            (candidate) => candidate.key === resScreenshot.key,
          );
          expect(screenshot).toBeDefined();
          const file = await readFile(screenshot!.path);
          await uploadFile(resScreenshot, file, "image/jpeg");
        }

        await request(app)
          .put(`/v2/builds/${createSecondShard.body.build.id}`)
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .set("x-argos-request-id", "shard-2")
          .send({
            screenshots: screenshotGroups[1]!.map((screenshot) => ({
              key: screenshot.key,
              name: screenshot.name,
            })),
            parallel: true,
            parallelTotal: 2,
          })
          .expect(200);

        await request(app)
          .put(`/v2/builds/${createSecondShard.body.build.id}`)
          .set("Host", "api.argos-ci.dev")
          .set("Authorization", "Bearer awesome-token")
          .set("x-argos-request-id", "shard-2")
          .send({
            screenshots: screenshotGroups[1]!.map((screenshot) => ({
              key: screenshot.key,
              name: screenshot.name,
            })),
            parallel: true,
            parallelTotal: 2,
          })
          .expect(200);

        build = await Build.query()
          .findById(createSecondShard.body.build.id)
          .withGraphFetched("compareScreenshotBucket")
          .throwIfNotFound();

        const shards = await BuildShard.query()
          .where("buildId", build.id)
          .orderBy("id", "asc");

        expect(build.batchCount).toBe(2);
        expect(build.compareScreenshotBucket!.complete).toBe(true);
        expect(shards.map((shard) => shard.nonce)).toEqual([
          "shard-1",
          "shard-2",
        ]);
      });

      it("inconsistent parallel count return an error", async () => {
        const updateResults = await Promise.all(
          screenshotGroups.map(async (screenshots, groupIndex) => {
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
                parallelNonce: "other-build-id",
              })
              .expect(201);

            // Upload screenshots
            await Promise.all(
              createResult.body.screenshots.map(
                async (resScreenshot: UploadEntry) => {
                  const path = screenshots.find(
                    (s) => s.key === resScreenshot.key,
                  )!.path;
                  const file = await readFile(path);

                  await uploadFile(resScreenshot, file, "image/jpeg");
                },
              ),
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
                parallelTotal: 2 + groupIndex,
              });

            return updateResult;
          }),
        );

        expect(updateResults[0]!.statusCode).toBe(200);
        expect(updateResults[1]!.statusCode).toBe(400);
        // @ts-expect-error error.text is not defined
        expect(JSON.parse(updateResults[1]!.error.text).error).toBe(
          "`parallelTotal` must be the same on every batch",
        );
      });
    });
  });
});
