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
/** The routed project: the account slug plus the project factory's name. */
const PROJECT_PATH = "acme/awesome-project";

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
    project,
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

    // Media is project-scoped, and a project token identifies its own project.
    const media = await Media.query().findById(res.body.media.id);
    expect(media?.projectId).toBe(project.id);
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
    // A team-scoped share page is the paid wedge; a free account gets a public
    // one and is told so rather than silently downgraded.
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

  test("requires a project when the caller holds a user token", async ({
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

    expect(res.body.error).toContain("`project` is required");
  });

  test("uploads to a named project with a user token", async ({
    patToken,
    project,
  }) => {
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${patToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: HASH,
        project: PROJECT_PATH,
      })
      .expect(201);

    const media = await Media.query().findById(res.body.media.id);
    expect(media?.projectId).toBe(project.id);
  });

  test("rejects a malformed project path", async ({ patToken }) => {
    const res = await request(app)
      .post("/media")
      .set("Authorization", `Bearer ${patToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: HASH,
        project: "acme",
      })
      .expect(400);

    expect(res.body.error).toContain("owner/project");
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
    project,
  }) => {
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
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
    // another project's uploads.
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other",
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: otherProject.id },
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

  test("lists every version, newest first, each with its own file", async ({
    projectToken,
    project,
  }) => {
    // A comment records the version its author was looking at, so acting on
    // feedback means fetching the file *that* version stored — not the current
    // one, which is the whole reason the feedback exists.
    const { media, version: first } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
      version: { number: 1, key: "media/1/v1.png" },
    });
    const second = await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      key: "media/1/v2.png",
    });

    const res = await request(app)
      .get(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body.version).toBe(2);
    expect(res.body.versions.map((v: { id: string }) => v.id)).toEqual([
      second.id,
      first.id,
    ]);
    // Each version points at its own bytes: resolving a comment's
    // `mediaVersionId` here has to reach a different file, or the list is
    // decoration.
    const [latest, previous] = res.body.versions;
    expect(latest.fileUrl).not.toBe(previous.fileUrl);
    expect(res.body.fileUrl).toBe(latest.fileUrl);
  });

  test("leaves an unfinalized upload out of the version list", async ({
    projectToken,
    project,
  }) => {
    // The row exists to sign the upload. Listing it would hand out a URL for
    // bytes that are not there.
    const { media, version } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
      version: { number: 1 },
    });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      uploadedAt: null,
      billedUnits: 0,
    });

    const res = await request(app)
      .get(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body.versions.map((v: { id: string }) => v.id)).toEqual([
      version.id,
    ]);
  });
});

describe("deleteMedia", () => {
  test("deletes the media", async ({ projectToken, project }) => {
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
    });

    await request(app)
      .delete(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(204);

    expect(await Media.query().findById(media.id)).toBeUndefined();
  });
});

describe("listMedia", () => {
  test("lists a project's media", async ({ patToken, project }) => {
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "one.png" },
    });
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "two.mp4" },
      version: { mimeType: "video/mp4" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media`)
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.pageInfo.total).toBe(2);
    expect(res.body.results).toHaveLength(2);
  });

  test("filters to videos", async ({ patToken, project }) => {
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "one.png" },
    });
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "two.mp4" },
      version: { mimeType: "video/mp4" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?type=video`)
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe("two.mp4");
  });

  test("hides media whose upload never completed", async ({
    patToken,
    project,
  }) => {
    // A media whose version never landed: the two-step upload passes through
    // this state, and nothing should list it.
    await factory.createMediaWithVersion({
      media: { projectId: project.id },
      version: { uploadedAt: null, billedUnits: 0 },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media`)
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(0);
  });

  test("excludes another project's media", async ({
    patToken,
    account,
    project,
  }) => {
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other",
    });
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "mine.png" },
    });
    await factory.createMediaWithVersion({
      media: { projectId: otherProject.id, name: "theirs.png" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media`)
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe("mine.png");
  });

  test("lets a project token list its own project's media", async ({
    projectToken,
    project,
  }) => {
    // Project scoping means CI can read back what it uploaded — the
    // account-scoped version could not, since a project token has no account
    // scope of its own.
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "one.png" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
  });
});
