import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";
import z from "zod";

import {
  Account,
  Media,
  Project,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import {
  createMediaHandler,
  deleteMediaHandler,
  getMediaHandler,
  listMediaHandler,
} from "./media";

const app = createTestHandlerApp(
  createMediaHandler,
  getMediaHandler,
  deleteMediaHandler,
  listMediaHandler,
);

const HASH = "a".repeat(64);

// The signing and delete paths talk to S3. Nothing here is testing AWS — the
// shared-key logic behind `deleteUnreferencedMediaObjects` has its own test.
vi.mock("@/media/object", () => ({
  headMediaObject: vi.fn(async () => null),
  deleteUnreferencedMediaObjects: vi.fn(async () => undefined),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn(async () => ({
    url: "https://s3.example.com/bucket",
    fields: { key: "media/1/abc.png", policy: "signed" },
  })),
}));

const test = base.extend<{
  user: User;
  account: Account;
  project: Project;
  patToken: string;
  projectToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await use(user);
  },
  account: async ({ user }, use) => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    // Team features need a plan — the same gate build creation applies. The free
    // plan puts the account on the Hobby media limits, which is what most of
    // these tests are about.
    const plan = await factory.Plan.create({
      name: "free",
      includedScreenshots: 5000,
    });
    await factory.Subscription.create({
      accountId: account.id,
      planId: plan.id,
    });
    await use(account);
  },
  project: async ({ account }, use) => {
    await use(
      await factory.Project.create({
        accountId: account.id,
        token: "project-token",
      }),
    );
  },
  patToken: async ({ user, account }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });
    await use(token);
  },
  projectToken: async ({ project }, use) => {
    await use(project.token);
  },
});

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("createMedia", () => {
  test("registers a media and returns a signed upload target", async ({
    projectToken,
    account,
  }) => {
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 2048,
        hash: HASH,
      })
      .expect(201);

    expect(res.body.media).toMatchObject({
      name: "before.png",
      contentType: "image/png",
      // Not uploaded yet, so nothing is billed and nothing is serveable.
      status: "pending",
    });
    // The share URL exists before the bytes do, so a caller can print it
    // without waiting on a large upload.
    expect(res.body.media.url).toMatch(/\/m\/.+/);
    expect(res.body.media.markdown).toContain(res.body.media.url);
    expect(res.body.upload).toMatchObject({
      url: "https://s3.example.com/bucket",
    });

    const media = await Media.query().findById(res.body.media.id);
    expect(media?.accountId).toBe(account.id);
  });

  test("rejects a content type that is not an accepted media type", async ({
    projectToken,
  }) => {
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .send({
        name: "payload.svg",
        // SVG can carry scripts, which is why it is not on the list.
        contentType: "image/svg+xml",
        size: 1024,
        hash: HASH,
      })
      .expect(400);

    expect(res.body.error).toBe("Invalid request");
  });

  test("rejects a file larger than the plan allows", async ({
    projectToken,
  }) => {
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .send({
        name: "huge.mp4",
        contentType: "video/mp4",
        // Past the 50 MB Hobby cap. Refused before anything is signed, so the
        // bytes never leave the caller.
        size: 60 * 1024 * 1024,
        hash: HASH,
      })
      .expect(413);

    expect(res.body.error).toContain("maximum file size");
  });

  test("refuses team-scoped visibility on a free plan", async ({
    projectToken,
  }) => {
    // Private links are the paid wedge; a free account gets a public URL and is
    // told so rather than silently downgraded.
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: HASH,
        visibility: "team",
      })
      .expect(402);

    expect(res.body.error).toContain("requires a paid plan");
  });

  test("refuses a team that has never subscribed", async () => {
    // Same answer build creation gives: team features are not free, and the free
    // tier lives on personal accounts.
    const unpaid = await factory.TeamAccount.create({ slug: "unpaid" });
    const unpaidProject = await factory.Project.create({
      accountId: unpaid.id,
      token: "unpaid-project-token",
    });

    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${unpaidProject.token}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: HASH,
      })
      .expect(402);

    expect(res.body.error).toContain("Pro plan");
  });

  test("requires an account slug when the caller holds a user token", async ({
    patToken,
  }) => {
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${patToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: HASH,
      })
      .expect(400);

    expect(res.body.error).toContain("accountSlug");
  });

  test("reuses the row when the same slug is uploaded again", async ({
    projectToken,
  }) => {
    const first = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: HASH,
        slug: "pr-42-before",
      })
      .expect(201);

    const second = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 4096,
        hash: "b".repeat(64),
        slug: "pr-42-before",
      })
      .expect(201);

    // Same id, so the share URL already pasted into a pull request keeps working.
    expect(second.body.media.id).toBe(first.body.media.id);
    expect(second.body.media.url).toBe(first.body.media.url);
  });
});

describe("getMedia", () => {
  test("returns a media the project token owns", async ({
    projectToken,
    account,
    project,
  }) => {
    const media = await factory.Media.create({
      accountId: account.id,
      projectId: project.id,
    });

    const res = await request(app)
      .get(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ id: media.id, status: "ready" });
  });

  test("404s on another project's media rather than 403", async ({
    projectToken,
    account,
  }) => {
    // The ids are sequential; confirming which exist would let a caller count
    // another team's uploads.
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other",
    });
    const media = await factory.Media.create({
      accountId: account.id,
      projectId: otherProject.id,
    });

    await request(app)
      .get(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(404);
  });

  test("400s on an id that is not an integer", async ({ projectToken }) => {
    await request(app)
      .get("/media/not-an-id")
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(400);
  });
});

describe("deleteMedia", () => {
  test("deletes the media", async ({ projectToken, account, project }) => {
    const media = await factory.Media.create({
      accountId: account.id,
      projectId: project.id,
    });

    await request(app)
      .delete(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(204);

    expect(await Media.query().findById(media.id)).toBeUndefined();
  });
});

describe("listMedia", () => {
  test("lists a team's media for an admin", async ({ patToken, account }) => {
    await factory.Media.create({ accountId: account.id, name: "one.png" });
    await factory.Media.create({
      accountId: account.id,
      name: "two.mp4",
      mimeType: "video/mp4",
    });

    const res = await request(app)
      .get("/accounts/acme/media")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(2);
    expect(res.body.results).toHaveLength(2);
  });

  test("filters to videos", async ({ patToken, account }) => {
    await factory.Media.create({ accountId: account.id, name: "one.png" });
    await factory.Media.create({
      accountId: account.id,
      name: "two.mp4",
      mimeType: "video/mp4",
    });

    const res = await request(app)
      .get("/accounts/acme/media?type=video")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe("two.mp4");
  });

  test("hides media whose upload never completed", async ({
    patToken,
    account,
  }) => {
    await factory.Media.create({
      accountId: account.id,
      uploadedAt: null,
      billedUnits: 0,
    });

    const res = await request(app)
      .get("/accounts/acme/media")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(0);
  });

  test("403s for a member who is not an administrator", async ({ account }) => {
    const member = await factory.User.create();
    await factory.UserAccount.create({ userId: member.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: member.id,
      userLevel: "member",
    });
    const token = `arp_${"f".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: member.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });

    const res = await request(app)
      .get("/accounts/acme/media")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(res.body.error).toContain("administrator");
  });

  test("401s a project token, which cannot act at account level", async ({
    projectToken,
  }) => {
    await request(app)
      .get("/accounts/acme/media")
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(401);
  });
});
