import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";

import {
  Account,
  GithubPullRequest,
  GithubRepository,
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
  listMediaHandler,
  updateMediaHandler,
} from "./media";

const app = createTestHandlerApp(
  createMediaHandler,
  listMediaHandler,
  updateMediaHandler,
);

const HASH = "b".repeat(64);
const PROJECT_PATH = "acme/awesome-project";

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

// Posting the comment is GitHub's side of publishing and has its own tests. What
// matters here is that it happens once per batch rather than once per media.
const updatePullRequestComment = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/media/pull-request-comment", () => ({ updatePullRequestComment }));

const { publishBranchMedia } = await import("@/media/publish");

const test = base.extend<{
  user: User;
  account: Account;
  project: Project;
  repository: GithubRepository;
  token: string;
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
  // Depends on `user` so it is created after the truncation that fixture does.
  repository: async ({ user: _user }, use) => {
    await use(await factory.GithubRepository.create());
  },
  project: async ({ account, repository }, use) => {
    await use(
      await factory.Project.create({
        accountId: account.id,
        token: "project-token",
        githubRepositoryId: repository.id,
      }),
    );
  },
  token: async ({ user, account }, use) => {
    const token = `arp_${"f".repeat(36)}`;
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
});

beforeAll(async () => {
  await setupDatabase();
});

/** Upload a media against a branch and return the created row. */
async function createOnBranch(args: {
  token: string;
  branch: string;
  name: string;
  hash?: string;
}) {
  const res = await request(app)
    .post("/media")
    .set("Authorization", `Bearer ${args.token}`)
    .send({
      project: PROJECT_PATH,
      branch: args.branch,
      name: args.name,
      contentType: "image/png",
      size: 2048,
      hash: args.hash ?? HASH,
    })
    .expect(201);
  return res.body.media;
}

describe("createMedia with a branch", () => {
  test("registers a staged media with no pull request and no GitHub call", async ({
    token,
    project: _project,
  }) => {
    // The point of the whole thing: an agent produces screenshots while it is
    // still on a branch, before a pull request exists to attach them to.
    const media = await createOnBranch({
      token,
      branch: "feat/checkout",
      name: "checkout.png",
    });

    expect(media).toMatchObject({
      stage: "staged",
      branch: "feat/checkout",
      prNumber: null,
    });
    // Shareable immediately: waiting for a pull request would defeat the point.
    expect(media.url).toMatch(/\/m\/.+/);
  });

  test("keeps two branches' media of the same name apart", async ({
    token,
    project,
  }) => {
    // With no pull request, the branch is what the media is attached to — so it
    // is what identity is keyed on. Folding these into one media would let one
    // branch's work overwrite another's.
    await createOnBranch({
      token,
      branch: "feat/a",
      name: "checkout.png",
    });
    await createOnBranch({
      token,
      branch: "feat/b",
      name: "checkout.png",
      hash: "c".repeat(64),
    });

    const media = await Media.query()
      .where("projectId", project.id)
      .orderBy("id");
    expect(media.map((item) => item.branch)).toEqual(["feat/a", "feat/b"]);
  });

  test("adds a version rather than a media when the same branch repeats a name", async ({
    token,
    project,
  }) => {
    const first = await createOnBranch({
      token,
      branch: "feat/a",
      name: "checkout.png",
    });
    const second = await createOnBranch({
      token,
      branch: "feat/a",
      name: "checkout.png",
      hash: "d".repeat(64),
    });

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    await expect(
      Media.query().where("projectId", project.id).resultSize(),
    ).resolves.toBe(1);
  });
});

describe("listMedia filters", () => {
  test("filters by branch", async ({ token, project }) => {
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "a.png", branch: "feat/a" },
    });
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "b.png", branch: "feat/b" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?branch=feat/a`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results.map((m: { name: string }) => m.name)).toEqual([
      "a.png",
    ]);
  });

  test("refuses an empty branch instead of answering with everything", async ({
    token,
    project,
  }) => {
    // `--branch "$BRANCH"` with `BRANCH` unset. Returning the whole project
    // hands the caller a page of other branches' media to act on.
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "a.png", branch: "feat/a" },
    });

    await request(app)
      .get(`/projects/${PROJECT_PATH}/media?branch=`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  test("filters by pull request number", async ({
    token,
    project,
    repository,
  }) => {
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 42,
    });
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "published.png",
        githubPullRequestId: pullRequest.id,
      },
    });
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "staged.png", branch: "feat/a" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?prNumber=42`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toMatchObject({
      name: "published.png",
      stage: "published",
      prNumber: 42,
    });
  });

  test("answers empty for a pull request Argos has never seen", async ({
    token,
    project,
  }) => {
    await factory.createMediaWithVersion({
      media: { projectId: project.id, branch: "feat/a" },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?prNumber=999`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toEqual([]);
  });

  test("filters by stage", async ({ token, project, repository }) => {
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 7,
    });
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "published.png",
        githubPullRequestId: pullRequest.id,
      },
    });
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "staged.png", branch: "feat/a" },
    });

    const stagedRes = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?stage=staged`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(stagedRes.body.results.map((m: { name: string }) => m.name)).toEqual(
      ["staged.png"],
    );

    const published = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?stage=published`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(published.body.results.map((m: { name: string }) => m.name)).toEqual(
      ["published.png"],
    );
  });

  test("keeps a published media under its branch filter", async ({
    token,
    project,
    repository,
  }) => {
    // The branch survives publishing, which is what lets "everything for this
    // work" stay one query across the moment the pull request opens.
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 8,
    });
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        branch: "feat/checkout",
        githubPullRequestId: pullRequest.id,
      },
    });

    const res = await request(app)
      .get(`/projects/${PROJECT_PATH}/media?branch=feat/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].stage).toBe("published");
  });
});

describe("updateMedia", () => {
  test("edits a staged media's name, description and branch", async ({
    token,
    project,
  }) => {
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "old.png", branch: "feat/a" },
    });

    const res = await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "new.png",
        description: "Now with the fix.",
        branch: "feat/b",
      })
      .expect(200);

    expect(res.body).toMatchObject({
      name: "new.png",
      description: "Now with the fix.",
      branch: "feat/b",
      stage: "staged",
    });
  });

  test("leaves omitted fields alone and clears explicit nulls", async ({
    token,
    project,
  }) => {
    const { media } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "keep.png",
        branch: "feat/a",
        description: "Original.",
      },
    });

    const res = await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: null })
      .expect(200);

    expect(res.body.name).toBe("keep.png");
    expect(res.body.branch).toBe("feat/a");
    expect(res.body.description).toBeNull();
  });

  test("refuses to edit a published media", async ({
    token,
    project,
    repository,
  }) => {
    // Its name is what the pull request comment is built from and what the next
    // upload of that name resolves against. Editing it rewrites history.
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 12,
    });
    const { media } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        githubPullRequestId: pullRequest.id,
      },
    });

    const res = await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "renamed.png" })
      .expect(400);

    expect(res.body.error).toContain("published");
  });

  test("409s rather than 500s when the rename collides", async ({
    token,
    project,
  }) => {
    await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "taken.png", branch: "feat/a" },
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id, name: "mine.png", branch: "feat/a" },
    });

    await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "taken.png" })
      .expect(409);
  });

  test("404s on another account's media", async ({ token }) => {
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    const otherProject = await factory.Project.create({
      accountId: otherAccount.id,
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: otherProject.id, branch: "feat/a" },
    });

    await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "mine.png" })
      .expect(404);
  });
});

describe("publishing when the pull request opens", () => {
  test("attaches a branch's staged media and comments once", async ({
    project,
    repository,
  }) => {
    updatePullRequestComment.mockClear();

    const { media: staged } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        branch: "feat/checkout",
      },
    });
    // A staged media on another branch, and one whose upload never landed:
    // neither belongs on this pull request.
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "other.png",
        branch: "feat/other",
      },
    });
    const pending = await factory.Media.create({
      projectId: project.id,
      name: "pending.png",
      branch: "feat/checkout",
    });

    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 77,
      headRef: "feat/checkout",
    });

    await expect(publishBranchMedia(pullRequest)).resolves.toBe(1);

    await expect(Media.query().findById(staged.id)).resolves.toMatchObject({
      githubPullRequestId: pullRequest.id,
    });
    await expect(Media.query().findById(pending.id)).resolves.toMatchObject({
      githubPullRequestId: null,
    });
    // One comment for the batch, not one per media.
    expect(updatePullRequestComment).toHaveBeenCalledTimes(1);
  });

  test("publishes nothing twice", async ({ project, repository }) => {
    updatePullRequestComment.mockClear();

    await factory.createMediaWithVersion({
      media: { projectId: project.id, branch: "feat/checkout" },
    });
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 78,
      headRef: "feat/checkout",
    });

    await expect(publishBranchMedia(pullRequest)).resolves.toBe(1);
    // Re-processing a pull request is routine — nothing is staged any more.
    await expect(publishBranchMedia(pullRequest)).resolves.toBe(0);
    expect(updatePullRequestComment).toHaveBeenCalledTimes(1);
  });

  test("does nothing for a pull request with no head branch recorded", async ({
    repository,
  }) => {
    const pullRequest = await GithubPullRequest.query().insertAndFetch({
      githubRepositoryId: repository.id,
      number: 79,
      jobStatus: "complete",
    });

    await expect(publishBranchMedia(pullRequest)).resolves.toBe(0);
  });

  test("never publishes another repository's branch of the same name", async ({
    account,
  }) => {
    // Branch names are not unique across an installation. Matching on the name
    // alone would publish one repository's work onto another's pull request.
    const otherRepository = await factory.GithubRepository.create();
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other-project",
      githubRepositoryId: otherRepository.id,
    });
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: otherProject.id, branch: "main" },
    });

    const repository = await factory.GithubRepository.create();
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 80,
      headRef: "main",
    });

    await expect(publishBranchMedia(pullRequest)).resolves.toBe(0);
    await expect(Media.query().findById(media.id)).resolves.toMatchObject({
      githubPullRequestId: null,
    });
  });
});
