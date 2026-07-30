import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Comment,
  CommentNotificationSubscription,
  Project,
  Test as TestModel,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { formatTestId } from "@/util/test-id";

import { createTestHandlerApp } from "../test-util";
import { addCommentReaction } from "./addCommentReaction";
import { createComment } from "./createComment";
import { deleteComment } from "./deleteComment";
import { getComment } from "./getComment";
import { listComments } from "./listComments";
import { removeCommentReaction } from "./removeCommentReaction";
import {
  resolveCommentThread,
  unresolveCommentThread,
} from "./resolveCommentThread";
import {
  subscribeCommentThread,
  unsubscribeCommentThread,
} from "./subscribeCommentThread";
import { updateComment } from "./updateComment";

const app = createTestHandlerApp((ctx) => {
  createComment(ctx);
  listComments(ctx);
  getComment(ctx);
  updateComment(ctx);
  deleteComment(ctx);
  addCommentReaction(ctx);
  removeCommentReaction(ctx);
  resolveCommentThread(ctx);
  unresolveCommentThread(ctx);
  subscribeCommentThread(ctx);
  unsubscribeCommentThread(ctx);
});

const DOC = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const test = base.extend<{
  user: User;
  otherUser: User;
  project: Project;
  test: TestModel;
  /** Public identifier of `test`, as it appears in the route. */
  testId: string;
  scopedPatToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  otherUser: async ({ user }, use) => {
    const otherUser = await factory.User.create();
    await factory.UserAccount.create({ userId: otherUser.id });
    await use(otherUser);
    void user;
  },
  project: async ({ user }, use) => {
    const [userAccount, teamAccount] = await Promise.all([
      factory.UserAccount.create({ userId: user.id }),
      factory.TeamAccount.create({ slug: "acme" }),
    ]);
    const project = await factory.Project.create({
      accountId: teamAccount.id,
      name: "web",
      token: "the-awesome-token",
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(project);
    void userAccount;
  },
  test: async ({ project }, use) => {
    const testModel = await factory.Test.create({
      projectId: project.id,
      name: "Header renders",
    });
    await use(testModel);
  },
  testId: async ({ project, test: testModel }, use) => {
    await use(
      formatTestId({ projectName: project.name, testId: testModel.id }),
    );
  },
  scopedPatToken: async ({ user, project }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: project.accountId,
    });
    await use(token);
  },
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("test comments API", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("posts a comment on a test", async ({
    user,
    test: testModel,
    testId,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: "This one is **flaky**" })
      .expect(201);

    expect(res.body).toMatchObject({
      buildId: null,
      testId: testModel.id,
      threadId: null,
      screenshotDiffId: null,
      pending: false,
      author: { id: expect.any(String) },
    });
    expect(res.body.text).toContain("This one is flaky");

    const comment = await Comment.query().findById(res.body.id);
    expect(comment?.userId).toBe(user.id);
    expect(comment?.buildId).toBeNull();
    expect(comment?.testId).toBe(testModel.id);
  });

  test("replies to a thread", async ({ testId, scopedPatToken }) => {
    const root = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Root") })
      .expect(201);

    const reply = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Reply"), threadId: root.body.id })
      .expect(201);

    expect(reply.body.threadId).toBe(root.body.id);
  });

  // The test endpoint's body has no snapshot or review options — those only
  // exist on a build — so they are dropped rather than honoured.
  test("ignores the build-only options", async ({
    project,
    testId,
    scopedPatToken,
  }) => {
    const build = await factory.Build.create({ projectId: project.id });
    const diff = await factory.ScreenshotDiff.create({ buildId: build.id });

    const res = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({
        body: DOC("Plain comment"),
        screenshotDiffId: diff.id,
        addToReview: true,
      })
      .expect(201);

    expect(res.body.screenshotDiffId).toBeNull();
    expect(res.body.pending).toBe(false);

    const comment = await Comment.query().findById(res.body.id);
    expect(comment?.screenshotDiffId).toBeNull();
    expect(comment?.buildReviewId).toBeNull();
  });

  test("lists and gets the comments on a test", async ({
    testId,
    scopedPatToken,
  }) => {
    const first = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("First") })
      .expect(201);
    await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Second") })
      .expect(201);

    const list = await request(app)
      .get(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .expect(200);

    expect(list.body).toHaveLength(2);
    expect(list.body.map((comment: { text: string }) => comment.text)).toEqual([
      "First",
      "Second",
    ]);

    const single = await request(app)
      .get(`/projects/acme/web/tests/${testId}/comments/${first.body.id}`)
      .set(auth(scopedPatToken))
      .expect(200);
    expect(single.body.id).toBe(first.body.id);
  });

  test("updates and deletes a comment", async ({ testId, scopedPatToken }) => {
    const created = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Before") })
      .expect(201);

    const updated = await request(app)
      .patch(`/projects/acme/web/tests/${testId}/comments/${created.body.id}`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("After") })
      .expect(200);
    expect(updated.body.text).toBe("After");
    expect(updated.body.editedAt).not.toBeNull();

    await request(app)
      .delete(`/projects/acme/web/tests/${testId}/comments/${created.body.id}`)
      .set(auth(scopedPatToken))
      .expect(200);

    const comment = await Comment.query().findById(created.body.id);
    expect(comment?.deletedAt).not.toBeNull();

    await request(app)
      .get(`/projects/acme/web/tests/${testId}/comments/${created.body.id}`)
      .set(auth(scopedPatToken))
      .expect(404);
  });

  test("adds and removes a reaction", async ({ testId, scopedPatToken }) => {
    const created = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("React to me") })
      .expect(201);

    const added = await request(app)
      .post(
        `/projects/acme/web/tests/${testId}/comments/${created.body.id}/reactions`,
      )
      .set(auth(scopedPatToken))
      .send({ emoji: "👍" })
      .expect(200);
    expect(added.body.reactions).toMatchObject([{ emoji: "👍", count: 1 }]);

    const removed = await request(app)
      .delete(
        `/projects/acme/web/tests/${testId}/comments/${created.body.id}/reactions?emoji=%F0%9F%91%8D`,
      )
      .set(auth(scopedPatToken))
      .expect(200);
    expect(removed.body.reactions).toEqual([]);
  });

  test("resolves and reopens a thread", async ({ testId, scopedPatToken }) => {
    const created = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Resolve me") })
      .expect(201);

    const resolved = await request(app)
      .post(
        `/projects/acme/web/tests/${testId}/comments/${created.body.id}/resolve`,
      )
      .set(auth(scopedPatToken))
      .expect(200);
    expect(resolved.body.resolvedAt).not.toBeNull();

    const reopened = await request(app)
      .post(
        `/projects/acme/web/tests/${testId}/comments/${created.body.id}/unresolve`,
      )
      .set(auth(scopedPatToken))
      .expect(200);
    expect(reopened.body.resolvedAt).toBeNull();
  });

  test("subscribes and unsubscribes from a thread", async ({
    user,
    testId,
    scopedPatToken,
  }) => {
    const created = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Watch me") })
      .expect(201);

    await request(app)
      .delete(
        `/projects/acme/web/tests/${testId}/comments/${created.body.id}/subscription`,
      )
      .set(auth(scopedPatToken))
      .expect(200);

    let subscription = await CommentNotificationSubscription.query().findOne({
      commentId: created.body.id,
      userId: user.id,
    });
    expect(subscription?.isSubscribed()).toBe(false);

    await request(app)
      .post(
        `/projects/acme/web/tests/${testId}/comments/${created.body.id}/subscription`,
      )
      .set(auth(scopedPatToken))
      .expect(200);

    subscription = await CommentNotificationSubscription.query().findOne({
      commentId: created.body.id,
      userId: user.id,
    });
    expect(subscription?.isSubscribed()).toBe(true);
  });

  test("does not expose a build comment through a test route", async ({
    project,
    testId,
    user,
    scopedPatToken,
  }) => {
    const build = await factory.Build.create({ projectId: project.id });
    const buildComment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Build comment"),
    });

    await request(app)
      .get(`/projects/acme/web/tests/${testId}/comments/${buildComment.id}`)
      .set(auth(scopedPatToken))
      .expect(404);

    const list = await request(app)
      .get(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(scopedPatToken))
      .expect(200);
    expect(list.body).toHaveLength(0);
  });

  test("returns 404 for a malformed test id", async ({ scopedPatToken }) => {
    const res = await request(app)
      .get("/projects/acme/web/tests/not-a-test-id/comments")
      .set(auth(scopedPatToken));
    expect(res.status).toBe(404);
  });

  test("rejects a user without project access", async ({
    otherUser,
    testId,
  }) => {
    const token = `arp_${"f".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: otherUser.id,
      token: hashToken(token),
    });
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: otherAccount.id,
    });

    const res = await request(app)
      .post(`/projects/acme/web/tests/${testId}/comments`)
      .set(auth(token))
      .send({ body: DOC("Hello") });
    expect(res.status).toBe(401);
  });
});
