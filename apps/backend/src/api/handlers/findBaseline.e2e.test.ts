import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { findBaseline } from "./findBaseline";

const app = createTestHandlerApp(findBaseline);

const TOKEN = "the-awesome-token";

const sha = (n: number) => n.toString(16).padStart(40, "0");

type Fixtures = {
  account: Account;
  project: Project;
};

const test = base.extend<Fixtures>({
  account: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create({ slug: "awesome-team" }));
  },
  project: async ({ account }, use) => {
    await use(
      await factory.Project.create({ token: TOKEN, accountId: account.id }),
    );
  },
});

/**
 * Create an eligible baseline build at a given commit: complete, valid, and
 * approved (a reference build is auto-approved).
 */
async function createEligibleBaseline(
  project: Project,
  commit: string,
  overrides?: {
    name?: string;
    mode?: "ci" | "monitoring";
    type?: "reference" | "orphan" | "check";
  },
) {
  const bucket = await factory.ScreenshotBucket.create({
    projectId: project.id,
    name: overrides?.name ?? "default",
    mode: overrides?.mode ?? "ci",
    commit,
    valid: true,
    complete: true,
  });
  const build = await factory.Build.create({
    projectId: project.id,
    compareScreenshotBucketId: bucket.id,
    name: overrides?.name ?? "default",
    mode: overrides?.mode ?? "ci",
    type: overrides?.type ?? "reference",
    jobStatus: "complete",
  });
  return build;
}

describe("findBaseline", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("requires authentication", async () => {
    const res = await request(app)
      .post("/baseline")
      .send({ commits: [sha(1)] })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  test("rejects an empty list of commits", async ({ project }) => {
    const res = await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [] })
      .expect(400);
    expect(res.body.error).toBeDefined();
    expect(project).toBeDefined();
  });

  test("rejects invalid commit SHAs", async ({ project }) => {
    const res = await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: ["not-a-sha"] })
      .expect(400);
    expect(res.body.error).toBeDefined();
    expect(project).toBeDefined();
  });

  test("returns null when no commit has an eligible baseline", async ({
    project,
  }) => {
    expect(project).toBeDefined();
    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(1), sha(2)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline).toBeNull();
      });
  });

  test("finds the eligible baseline matching one of the commits", async ({
    project,
  }) => {
    const build = await createEligibleBaseline(project, sha(10));

    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(99), sha(10), sha(98)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline).toMatchObject({
          id: build.id,
          head: { sha: sha(10) },
        });
      });
  });

  test("respects the order of the commits and picks the first match", async ({
    project,
  }) => {
    const closest = await createEligibleBaseline(project, sha(20));
    const furthest = await createEligibleBaseline(project, sha(21));

    // The closest ancestor comes first in the list, so it wins.
    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(20), sha(21)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline.id).toBe(closest.id);
      });

    // Reversing the order makes the other commit win.
    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(21), sha(20)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline.id).toBe(furthest.id);
      });
  });

  test("ignores builds that are not approved", async ({ project }) => {
    // A check build without any review is not an eligible baseline.
    await createEligibleBaseline(project, sha(30), { type: "check" });

    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(30)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline).toBeNull();
      });
  });

  test("ignores rejected builds", async ({ project }) => {
    const build = await createEligibleBaseline(project, sha(40));
    await factory.BuildReview.create({ buildId: build.id, state: "rejected" });

    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(40)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline).toBeNull();
      });
  });

  test("only considers builds with the requested name", async ({ project }) => {
    await createEligibleBaseline(project, sha(50), { name: "other" });

    // The default name does not match the "other" build.
    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(50)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline).toBeNull();
      });

    // Querying the right name finds it.
    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(50)], name: "other" })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline.head.sha).toBe(sha(50));
      });
  });

  test("only considers builds with the requested mode", async ({ project }) => {
    await createEligibleBaseline(project, sha(60), { mode: "monitoring" });

    // The default "ci" mode does not match the monitoring build.
    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(60)] })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline).toBeNull();
      });

    await request(app)
      .post("/baseline")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ commits: [sha(60)], mode: "monitoring" })
      .expect(200)
      .expect((res) => {
        expect(res.body.baseline.head.sha).toBe(sha(60));
      });
  });
});
