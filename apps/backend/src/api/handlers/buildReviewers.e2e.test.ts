import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";
import z from "zod";

import {
  Account,
  Build,
  BuildNotificationSubscription,
  BuildRequestedReviewer,
  Project,
  Test,
  TestNotificationSubscription,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import * as notification from "@/notification";
import { formatTestId } from "@/util/test-id";

import { createTestHandlerApp } from "../test-util";
import {
  addBuildReviewers,
  listBuildReviewers,
  removeBuildReviewers,
} from "./buildReviewers";
import {
  subscribeBuild,
  subscribeTest,
  unsubscribeBuild,
  unsubscribeTest,
} from "./subscribeBuild";

const app = createTestHandlerApp(
  listBuildReviewers,
  addBuildReviewers,
  removeBuildReviewers,
  subscribeBuild,
  unsubscribeBuild,
  subscribeTest,
  unsubscribeTest,
);

const sendNotification = vi
  .spyOn(notification, "sendNotification")
  .mockResolvedValue(undefined as never);

async function createScopedPatToken(input: {
  user: User;
  account: Account;
  token: string;
}): Promise<string> {
  const userAccessToken = await factory.UserAccessToken.create({
    userId: input.user.id,
    token: hashToken(input.token),
  });
  await UserAccessTokenScope.query().insert({
    userAccessTokenId: userAccessToken.id,
    accountId: input.account.id,
  });
  return input.token;
}

const test = base.extend<{
  user: User;
  account: Account;
  project: Project;
  build: Build;
  token: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    sendNotification.mockClear();
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
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      name: "web",
      accountId: account.id,
    });
    await use(project);
  },
  build: async ({ project }, use) => {
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: bucket.id,
      number: 1,
    });
    await use(build);
  },
  token: async ({ user, account }, use) => {
    await use(
      await createScopedPatToken({
        user,
        account,
        token: `arp_${"e".repeat(36)}`,
      }),
    );
  },
});

/** A second team member, eligible to be requested as a reviewer. */
async function createTeammate(account: Account): Promise<Account> {
  const userAccount = await factory.UserAccount.create();
  invariant(userAccount.userId);
  await factory.TeamUser.create({
    teamId: account.teamId,
    userId: userAccount.userId,
    userLevel: "member",
  });
  return userAccount;
}

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("buildReviewers", () => {
  test("requests a reviewer and notifies them", async ({
    account,
    build,
    token,
  }) => {
    const teammate = await createTeammate(account);

    const res = await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [teammate.id] })
      .expect(200);

    expect(res.body.reviewers).toHaveLength(1);
    expect(res.body.reviewers[0]).toMatchObject({ id: teammate.id });
    expect(
      await BuildRequestedReviewer.query()
        .where({ buildId: build.id })
        .resultSize(),
    ).toBe(1);
    expect(sendNotification).toHaveBeenCalledOnce();
  });

  test("is idempotent and does not re-notify", async ({
    account,
    build,
    token,
  }) => {
    const teammate = await createTeammate(account);
    const body = { userIds: [teammate.id] };

    await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(200);
    sendNotification.mockClear();

    const res = await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(200);

    expect(res.body.reviewers).toHaveLength(1);
    expect(
      await BuildRequestedReviewer.query()
        .where({ buildId: build.id })
        .resultSize(),
    ).toBe(1);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test("ignores users without access to the project", async ({
    build,
    token,
  }) => {
    const stranger = await factory.UserAccount.create();

    const res = await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [stranger.id] })
      .expect(200);

    expect(res.body.reviewers).toEqual([]);
    expect(
      await BuildRequestedReviewer.query()
        .where({ buildId: build.id })
        .resultSize(),
    ).toBe(0);
  });

  test("ignores a self-request", async ({ user, build, token }) => {
    const ownAccount = await Account.query().findOne({ userId: user.id });
    invariant(ownAccount);

    const res = await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [ownAccount.id] })
      .expect(200);

    expect(res.body.reviewers).toEqual([]);
    expect(
      await BuildRequestedReviewer.query()
        .where({ buildId: build.id })
        .resultSize(),
    ).toBe(0);
  });

  test("lists the requested reviewers", async ({ account, build, token }) => {
    expect(build.number).toBe(1);
    const teammate = await createTeammate(account);
    await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [teammate.id] })
      .expect(200);

    const res = await request(app)
      .get("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.reviewers).toHaveLength(1);
    expect(res.body.reviewers[0].id).toBe(teammate.id);
  });

  test("cancels a request", async ({ account, build, token }) => {
    const teammate = await createTeammate(account);
    await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [teammate.id] })
      .expect(200);

    const res = await request(app)
      .delete("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [teammate.id] })
      .expect(200);

    expect(res.body.reviewers).toEqual([]);
    expect(
      await BuildRequestedReviewer.query()
        .where({ buildId: build.id })
        .resultSize(),
    ).toBe(0);
  });

  test("400s on an empty user list", async ({ token }) => {
    await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [] })
      .expect(400);
  });

  test("404s on an unknown build", async ({ token }) => {
    await request(app)
      .get("/projects/acme/web/builds/999/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  test("403s without the review permission", async ({ account, build }) => {
    // A contributor with no project-level access cannot review.
    const contributor = await factory.User.create();
    await factory.UserAccount.create({ userId: contributor.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: contributor.id,
      userLevel: "contributor",
    });
    const token = await createScopedPatToken({
      user: contributor,
      account,
      token: `arp_${"f".repeat(36)}`,
    });
    const teammate = await createTeammate(account);

    await request(app)
      .post("/projects/acme/web/builds/1/reviewers")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [teammate.id] })
      .expect(403);

    expect(
      await BuildRequestedReviewer.query()
        .where({ buildId: build.id })
        .resultSize(),
    ).toBe(0);
  });
});

describe("build subscription", () => {
  test("subscribes and unsubscribes", async ({ user, build, token }) => {
    const subscribe = await request(app)
      .post("/projects/acme/web/builds/1/subscription")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(subscribe.body).toEqual({ subscribed: true });
    const subscribed = await BuildNotificationSubscription.query().findOne({
      buildId: build.id,
      userId: user.id,
    });
    expect(subscribed?.subscribedAt).not.toBeNull();
    expect(subscribed?.unsubscribedAt).toBeNull();

    const unsubscribe = await request(app)
      .delete("/projects/acme/web/builds/1/subscription")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(unsubscribe.body).toEqual({ subscribed: false });
    const unsubscribed = await BuildNotificationSubscription.query().findOne({
      buildId: build.id,
      userId: user.id,
    });
    expect(unsubscribed?.unsubscribedAt).not.toBeNull();
  });

  test("404s on an unknown build", async ({ token }) => {
    await request(app)
      .post("/projects/acme/web/builds/999/subscription")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});

describe("test subscription", () => {
  test("subscribes and unsubscribes", async ({ user, project, token }) => {
    const testRow: Test = await factory.Test.create({
      projectId: project.id,
      name: "home",
    });
    const testId = formatTestId({
      projectName: project.name,
      testId: testRow.id,
    });

    const subscribe = await request(app)
      .post(`/projects/acme/web/tests/${testId}/subscription`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(subscribe.body).toEqual({ subscribed: true });
    const subscribed = await TestNotificationSubscription.query().findOne({
      testId: testRow.id,
      userId: user.id,
    });
    expect(subscribed?.subscribedAt).not.toBeNull();
    expect(subscribed?.unsubscribedAt).toBeNull();

    const unsubscribe = await request(app)
      .delete(`/projects/acme/web/tests/${testId}/subscription`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(unsubscribe.body).toEqual({ subscribed: false });
    const unsubscribed = await TestNotificationSubscription.query().findOne({
      testId: testRow.id,
      userId: user.id,
    });
    expect(unsubscribed?.unsubscribedAt).not.toBeNull();
  });

  test("404s on an unknown test", async ({ token }) => {
    await request(app)
      .post("/projects/acme/web/tests/WEB-nope/subscription")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
