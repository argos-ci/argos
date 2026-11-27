import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";
import z from "zod";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { createBuild } from "./createBuild";

vi.mock("@/storage/s3", async () => {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
  });
  return { getS3Client: () => client };
});

const app = createTestHandlerApp(createBuild);

const test = base.extend<{ project: Project }>({
  project: [
    async ({}, use) => {
      await setupDatabase();
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      await factory.Subscription.create({ accountId: account.id });
      const project = await factory.Project.create({
        accountId: account.id,
      });
      await factory.createProjectToken({
        projects: [project],
        token: "the-awesome-token",
      });
      await use(project);
    },
    { auto: true },
  ],
});

describe("createBuild", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("with more than 5000 screenshots", () => {
    test("rejects the build and points to parallel mode", async () => {
      const screenshots = Array.from({ length: 5001 }, (_, index) => ({
        key: index.toString(16).padStart(64, "0"),
        contentType: "image/png",
      }));

      await request(app)
        .post("/builds")
        .set("Authorization", "Bearer the-awesome-token")
        .send({ commit: "a".repeat(40), branch: "main", screenshots })
        .expect(400)
        .expect((res) => {
          expect(JSON.stringify(res.body)).toContain("parallel mode");
        });
    });
  });

  test("binds each upload to the SHA-256 its key declares", async () => {
    const key = "ab".repeat(32);

    const res = await request(app)
      .post("/builds")
      .set("Authorization", "Bearer the-awesome-token")
      .send({
        commit: "a".repeat(40),
        branch: "main",
        screenshots: [{ key, contentType: "image/png" }],
      })
      .expect(201);

    const [upload] = res.body.screenshots;
    expect(upload.key).toBe(key);
    const checksum = Buffer.from(key, "hex").toString("base64");
    // Both fields are signed, as on the media upload path.
    expect(upload.fields["x-amz-checksum-algorithm"]).toBe("SHA256");
    expect(upload.fields["x-amz-checksum-sha256"]).toBe(checksum);
    const policy = JSON.parse(
      Buffer.from(upload.fields.Policy, "base64").toString("utf8"),
    );
    expect(policy.conditions).toContainEqual({
      "x-amz-checksum-algorithm": "SHA256",
    });
    expect(policy.conditions).toContainEqual({
      "x-amz-checksum-sha256": checksum,
    });
  });
});
