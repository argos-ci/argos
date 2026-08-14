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
import {
  deleteUnreferencedMediaDiffObjects,
  getMediaDiffObjects,
} from "@/media/object";

import { createTestHandlerApp } from "../test-util";
import {
  createMediaHandler,
  deleteMediaHandler,
  getMediaHandler,
  listMediaHandler,
  listMediaVersionsHandler,
  updateMediaHandler,
} from "./media";

const app = createTestHandlerApp(
  createMediaHandler,
  getMediaHandler,
  deleteMediaHandler,
  listMediaHandler,
  listMediaVersionsHandler,
  updateMediaHandler,
);

const HASH = "a".repeat(64);
/** Different bytes, for the upload that has to land as a second version. */
const OTHER_HASH = "b".repeat(64);
/** The routed project: the account slug plus the project factory's name. */
const PROJECT_PATH = "acme/awesome-project";

// The signing and delete paths talk to S3. Nothing here is testing AWS — the
// shared-key logic behind `deleteUnreferencedMediaObjects` has its own test.
vi.mock("@/media/object", () => ({
  headMediaObject: vi.fn(async () => null),
  deleteUnreferencedMediaObjects: vi.fn(async () => undefined),
  deleteUnreferencedMediaDiffObjects: vi.fn(async () => undefined),
  getMediaDiffObjects: vi.fn(async () => ({
    keys: ["media/1/diffs/mask.png"],
    diffIds: ["1"],
  })),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn(async () => ({
    url: "https://s3.example.com/bucket",
    fields: { key: "media/1/abc.png", policy: "signed" },
  })),
}));

/**
 * A team account owned by `user`, on a plan of the given name.
 *
 * Team features need a plan at all — the same gate build creation applies — and
 * which plan it is decides the media limits: `free` is Hobby, anything else is
 * Pro. That is the difference between a public-only account and one that can hold
 * a team-scoped share page, so the tests that care create their own.
 */
async function createTeamAccountOnPlan(args: {
  user: User;
  planName: string;
}): Promise<Account> {
  const account = await factory.TeamAccount.create({ slug: "acme" });
  await factory.TeamUser.create({
    teamId: account.teamId,
    userId: args.user.id,
    userLevel: "owner",
  });
  const plan = await factory.Plan.create({
    name: args.planName,
    includedScreenshots: 5000,
  });
  await factory.Subscription.create({
    accountId: account.id,
    planId: plan.id,
  });
  return account;
}

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
    // The free plan puts the account on the Hobby media limits, which is what
    // most of these tests are about.
    await use(await createTeamAccountOnPlan({ user, planName: "free" }));
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

beforeAll(async () => {
  z.globalRegistry.clear();
  // The `user` fixture truncates, but only for tests that ask for a fixture. A
  // test taking none would otherwise inherit whatever the previous *file* left
  // in this worker's database.
  await setupDatabase();
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
    // The embed shows the file and links to the page. Pointing the image part at
    // the share URL renders as a broken image wherever it is pasted.
    expect(res.body.media.markdown).toBe(
      `[![before.png](${res.body.media.fileUrl})](${res.body.media.url})`,
    );
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

  test("refuses a team that has never subscribed", async ({ user: _user }) => {
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

/**
 * Who can open the share page of a media that did not ask for a visibility.
 *
 * The everyday upload takes no flag, so this default is what most share pages
 * actually get — and getting it wrong either leaks a private product's
 * screenshots or breaks the link for the reviewer the feature exists for. Worth
 * pinning end to end.
 */
describe("createMedia default visibility", () => {
  // Hobby is public-only, so it cannot show what the project's visibility does.
  const proTest = test.extend<{ account: Account }>({
    account: async ({ user }, use) => {
      await use(await createTeamAccountOnPlan({ user, planName: "pro" }));
    },
  });

  async function upload(args: {
    projectToken: string;
    hash: string;
    visibility?: "team" | "public";
  }) {
    return request(app)
      .post("/media")
      .set("Authorization", `Bearer ${args.projectToken}`)
      .send({
        name: "before.png",
        contentType: "image/png",
        size: 1024,
        hash: args.hash,
        ...(args.visibility ? { visibility: args.visibility } : {}),
      })
      .expect(201);
  }

  proTest(
    "is public on a public project",
    async ({ project, projectToken }) => {
      await project.$query().patch({ private: false });

      const res = await upload({ projectToken, hash: HASH });

      // Nothing the project does not already show, and the link works for a
      // reviewer with no Argos account.
      expect(res.body.media.visibility).toBe("public");
    },
  );

  proTest(
    "is team-only on a private project",
    async ({ project, projectToken }) => {
      await project.$query().patch({ private: true });

      const res = await upload({ projectToken, hash: HASH });

      // Uploading a screenshot of a private product must not publish it.
      expect(res.body.media.visibility).toBe("team");
    },
  );

  test("falls back to public on a private project whose plan has no team-scoped page", async ({
    project,
    projectToken,
  }) => {
    await project.$query().patch({ private: true });

    const res = await upload({ projectToken, hash: HASH });

    // Hobby sells no team-scoped share page, so this is the whole of what the
    // plan can offer — and what its documentation promises.
    expect(res.body.media.visibility).toBe("public");
  });

  proTest(
    "leaves a visibility chosen once alone on the next upload",
    async ({ project, projectToken }) => {
      await project.$query().patch({ private: false });
      await upload({ projectToken, hash: HASH, visibility: "team" });

      // Same name, so this is a new version of that media — and it names no
      // visibility. Handing it back to the project's default here would publish a
      // deliberately team-only screenshot, silently.
      const res = await upload({ projectToken, hash: OTHER_HASH });

      expect(res.body.media).toMatchObject({ version: 2, visibility: "team" });
    },
  );
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

  test("404s a public media in a project the caller cannot open", async ({
    user,
    account,
  }) => {
    // `public` visibility governs the share page, where the caller presented an
    // unguessable token. Here they present a sequential id, so reading takes
    // project access — otherwise an account insider walks the id space and reads
    // every public media in projects they hold nothing on.
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "closed-project",
      defaultUserLevel: null,
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: otherProject.id, visibility: "public" },
    });

    const outsider = await factory.User.create();
    await factory.UserAccount.create({ userId: outsider.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: outsider.id,
      userLevel: "contributor",
    });
    const outsiderToken = `arp_${"d".repeat(36)}`;
    const accessToken = await factory.UserAccessToken.create({
      userId: outsider.id,
      token: hashToken(outsiderToken),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: accessToken.id,
      accountId: account.id,
    });
    expect(user.id).not.toBe(outsider.id);

    await request(app)
      .get(`/media/${media.id}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .expect(404);
    await request(app)
      .get(`/media/${media.id}/versions`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .expect(404);
  });

  test("lets a reviewer finalize and edit their own upload", async ({
    account,
  }) => {
    // Uploading takes `review`, so finishing and correcting the upload must too.
    // Gating either on `admin` leaves a reviewer able to start an upload and
    // unable to complete it — the primary flow, half-broken.
    const project = await factory.Project.create({
      accountId: account.id,
      name: "reviewer-project",
      defaultUserLevel: "reviewer",
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id, branch: "feat/a" },
      version: { number: 1, uploadedAt: null, billedUnits: 0 },
    });

    const reviewer = await factory.User.create();
    await factory.UserAccount.create({ userId: reviewer.id });
    // A contributor, not a member: members get every project permission, so the
    // test would pass whatever the gate demanded. The project's default level
    // makes this one a reviewer and nothing more.
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: reviewer.id,
      userLevel: "contributor",
    });
    const reviewerToken = `arp_${"b".repeat(36)}`;
    const accessToken = await factory.UserAccessToken.create({
      userId: reviewer.id,
      token: hashToken(reviewerToken),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: accessToken.id,
      accountId: account.id,
    });

    await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send({ branch: "feat/b" })
      .expect(200);
  });

  test("400s on an id that is not an integer", async ({ projectToken }) => {
    await request(app)
      .get("/media/not-an-id")
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(400);
  });

  test("reports the newest version and how many there are", async ({
    projectToken,
    project,
  }) => {
    // What the media carries about its history: the newest upload flattened onto
    // it, and a count. The count is the whole point — a caller seeing 1 knows
    // there is nothing to go and fetch.
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
      version: { number: 1, key: "media/1/v1.png" },
    });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      key: "media/1/v2.png",
    });

    const res = await request(app)
      .get(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body.version).toBe(2);
    expect(res.body.versionCount).toBe(2);
    // The history itself is a separate call, so it stays off this response.
    expect(res.body.versions).toBeUndefined();
  });
});

describe("listMediaVersions", () => {
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
      .get(`/media/${media.id}/versions`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body.map((v: { id: string }) => v.id)).toEqual([
      second.id,
      first.id,
    ]);
    // Each version points at its own bytes: resolving a comment's
    // `mediaVersionId` here has to reach a different file, or the list is
    // decoration.
    const [latest, previous] = res.body;
    expect(latest.fileUrl).not.toBe(previous.fileUrl);
    expect(latest.number).toBe(2);
  });

  test("leaves an unfinalized upload out", async ({
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
      .get(`/media/${media.id}/versions`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(200);

    expect(res.body.map((v: { id: string }) => v.id)).toEqual([version.id]);
  });

  test("404s on another project's media rather than 403", async ({
    projectToken,
    account,
  }) => {
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other-versions",
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: otherProject.id },
    });

    await request(app)
      .get(`/media/${media.id}/versions`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(404);
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

  test("takes the pair's diff masks with it", async ({
    projectToken,
    project,
  }) => {
    // The masks hang off the versions and their rows cascade away with them, so
    // if they are not collected here nothing is left naming the objects — and
    // unlike an expired version, the retention purge will never see them.
    const { media, version } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
    });

    await request(app)
      .delete(`/media/${media.id}`)
      .set("Authorization", `Bearer ${projectToken}`)
      .expect(204);

    // Read inside the transaction, while the rows still name the objects.
    expect(getMediaDiffObjects).toHaveBeenCalledWith(
      [version.id],
      expect.anything(),
    );
    // Dropped after it commits, so the reference check reads the real
    // post-delete state and needs no exclusions.
    expect(deleteUnreferencedMediaDiffObjects).toHaveBeenCalledWith({
      keys: ["media/1/diffs/mask.png"],
      excludeDiffIds: [],
    });
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
