import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import { formatCommentId } from "@/comment/id";
import {
  Account,
  Build,
  BuildNotificationSubscription,
  Comment,
  CommentMention,
  CommentNotificationSubscription,
  Project,
} from "@/database/models";
import { subscribeUserToBuild } from "@/database/services/build-notification-subscription";
import { subscribeUserToCommentThread } from "@/database/services/comment-notification-subscription";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

const MUTATION = `
  mutation AddBuildComment($input: AddBuildCommentInput!) {
    addBuildComment(input: $input) {
      id
      comments {
        id
        content
        threadId
        threadSubscribed
        user {
          id
        }
      }
    }
  }
`;

const ANCHORED_MUTATION = `
  mutation AddAnchoredBuildComment($input: AddBuildCommentInput!) {
    addBuildComment(input: $input) {
      id
      comments {
        id
        screenshotDiff {
          id
        }
        anchor {
          __typename
          ... on CommentPointAnchor {
            side
            x
            y
          }
          ... on CommentLinesAnchor {
            from
            to
          }
        }
      }
    }
  }
`;

const SUBSCRIBE_TO_THREAD_MUTATION = `
  mutation SubscribeToCommentThread($input: SubscribeToCommentThreadInput!) {
    subscribeToCommentThread(input: $input) {
      id
      threadSubscribed
    }
  }
`;

const UNSUBSCRIBE_FROM_THREAD_MUTATION = `
  mutation UnsubscribeFromCommentThread(
    $input: UnsubscribeFromCommentThreadInput!
  ) {
    unsubscribeFromCommentThread(input: $input) {
      id
      threadSubscribed
    }
  }
`;

function commentBody(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function mentionBody(account: Account) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hey " },
          {
            type: "mention",
            attrs: { id: account.id, label: account.slug },
          },
        ],
      },
    ],
  };
}

function getAccountUser(account: Account) {
  invariant(account.user);
  return account.user;
}

function getAccountUserId(account: Account) {
  invariant(account.userId);
  return account.userId;
}

type Fixtures = {
  fixture: {
    userAccount: Account;
    teamAccount: Account;
    project: Project;
    build: Build;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [userAccount, teamAccount] = await Promise.all([
      factory.UserAccount.create(),
      factory.TeamAccount.create(),
    ]);
    invariant(teamAccount.teamId);
    invariant(userAccount.userId);
    const [project] = await Promise.all([
      factory.Project.create({ accountId: teamAccount.id }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: userAccount.userId,
        userLevel: "owner",
      }),
      userAccount.$fetchGraph("user"),
      teamAccount.$fetchGraph("team"),
    ]);
    const build = await factory.Build.create({ projectId: project.id });
    await use({ build, userAccount, teamAccount, project });
  },
});

describe("GraphQL addBuildComment mutation", () => {
  beforeEach(() => {
    mockSendNotification.mockReset();
  });

  test("posts a comment on a build", async ({ fixture }) => {
    const userId = getAccountUserId(fixture.userAccount);
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const body = commentBody("Looks great to me!");
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: { input: { buildId: fixture.build.id, body } },
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);

    const comments = res.body.data.addBuildComment.comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual(body);
    expect(comments[0].threadId).toBeNull();
    expect(comments[0].threadSubscribed).toBe(true);
    expect(comments[0].user.id).toBe(fixture.userAccount.id);

    const stored = await Comment.query().where({ buildId: fixture.build.id });
    expect(stored).toHaveLength(1);
    const storedComment = stored.at(0);
    invariant(storedComment);
    expect(storedComment.buildReviewId).toBeNull();
    expect(storedComment.threadId).toBeNull();
    expect(storedComment.userId).toBe(userId);

    // The author is auto-subscribed to the build.
    const subscription = await BuildNotificationSubscription.query().findOne({
      buildId: fixture.build.id,
      userId,
    });
    expect(subscription?.isSubscribed()).toBe(true);

    // The author is auto-subscribed to the comment thread.
    const threadSubscription =
      await CommentNotificationSubscription.query().findOne({
        commentId: storedComment.id,
        userId,
      });
    expect(threadSubscription?.isSubscribed()).toBe(true);
  });

  test("notifies the build subscribers", async ({ fixture }) => {
    const subscriberAccount = await factory.UserAccount.create();
    await subscriberAccount.$fetchGraph("user");
    const subscriberUserId = getAccountUserId(subscriberAccount);
    await subscribeUserToBuild({
      buildId: fixture.build.id,
      userId: subscriberUserId,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: commentBody("Please take another look."),
          },
        },
      });

    expectNoGraphQLError(res);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.type).toBe("comment_added");
    // The author is excluded, the subscriber is notified.
    expect(call.recipients).toEqual([subscriberUserId]);
  });

  test("posts a reply in the root comment thread", async ({ fixture }) => {
    invariant(fixture.userAccount.userId);
    const rootComment = await factory.Comment.create({
      buildId: fixture.build.id,
      userId: fixture.userAccount.userId,
      content: commentBody("Can we tweak this?"),
    });
    const subscriberAccount = await factory.UserAccount.create();
    await subscriberAccount.$fetchGraph("user");
    invariant(subscriberAccount.userId);
    await subscribeUserToCommentThread({
      commentId: rootComment.id,
      userId: subscriberAccount.userId,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const body = commentBody("Done, please check again.");
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            threadId: formatCommentId(rootComment.id),
            body,
          },
        },
      });

    expectNoGraphQLError(res);
    const storedReply = await Comment.query().findOne({
      buildId: fixture.build.id,
      threadId: rootComment.id,
    });
    invariant(storedReply);
    expect(storedReply.content).toEqual(body);
    expect(storedReply.userId).toBe(fixture.userAccount.userId);

    const threadSubscription =
      await CommentNotificationSubscription.query().findOne({
        commentId: rootComment.id,
        userId: fixture.userAccount.userId,
      });
    expect(threadSubscription?.isSubscribed()).toBe(true);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.type).toBe("comment_replied");
    expect(call.recipients).toEqual([subscriberAccount.userId]);
  });

  test("subscribes and unsubscribes from a comment thread", async ({
    fixture,
  }) => {
    invariant(fixture.userAccount.userId);
    const rootComment = await factory.Comment.create({
      buildId: fixture.build.id,
      userId: fixture.userAccount.userId,
      content: commentBody("Can we tweak this?"),
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );

    const subscribeRes = await request(app)
      .post("/graphql")
      .send({
        query: SUBSCRIBE_TO_THREAD_MUTATION,
        variables: { input: { commentId: formatCommentId(rootComment.id) } },
      });

    expectNoGraphQLError(subscribeRes);
    expect(
      subscribeRes.body.data.subscribeToCommentThread.threadSubscribed,
    ).toBe(true);

    const unsubscribeRes = await request(app)
      .post("/graphql")
      .send({
        query: UNSUBSCRIBE_FROM_THREAD_MUTATION,
        variables: { input: { commentId: formatCommentId(rootComment.id) } },
      });

    expectNoGraphQLError(unsubscribeRes);
    expect(
      unsubscribeRes.body.data.unsubscribeFromCommentThread.threadSubscribed,
    ).toBe(false);

    const subscription = await CommentNotificationSubscription.query().findOne({
      commentId: rootComment.id,
      userId: fixture.userAccount.userId,
    });
    expect(subscription?.isSubscribed()).toBe(false);
  });

  test("rejects an invalid comment body", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: { type: "doc", content: [{ type: "unknownNode" }] },
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Invalid comment body");
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });

  test("rejects an empty comment", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: { type: "doc", content: [{ type: "paragraph" }] },
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Comment cannot be empty");
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });

  test("records and notifies a mentioned team member", async ({ fixture }) => {
    invariant(fixture.teamAccount.teamId);
    // A second team member that the author can mention.
    const mentionedAccount = await factory.UserAccount.create();
    await mentionedAccount.$fetchGraph("user");
    invariant(mentionedAccount.userId);
    await factory.TeamUser.create({
      teamId: fixture.teamAccount.teamId,
      userId: mentionedAccount.userId,
      userLevel: "member",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: mentionBody(mentionedAccount),
          },
        },
      });

    expectNoGraphQLError(res);

    const comment = await Comment.query().findOne({
      buildId: fixture.build.id,
    });
    invariant(comment);

    // The mention is recorded.
    const mentions = await CommentMention.query().where({
      commentId: comment.id,
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.type).toBe("user");
    expect(mentions[0]?.mentionedUserId).toBe(mentionedAccount.userId);

    // The mentioned user is subscribed to the thread.
    const subscription = await CommentNotificationSubscription.query().findOne({
      commentId: comment.id,
      userId: mentionedAccount.userId,
    });
    expect(subscription?.isSubscribed()).toBe(true);

    // The mentioned user gets a dedicated comment_mention notification.
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.type).toBe("comment_mention");
    expect(call.recipients).toEqual([mentionedAccount.userId]);
  });

  test("ignores a mention of a user without project access", async ({
    fixture,
  }) => {
    // An account that is not part of the project's team.
    const outsiderAccount = await factory.UserAccount.create();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: mentionBody(outsiderAccount),
          },
        },
      });

    expectNoGraphQLError(res);
    const comment = await Comment.query().findOne({
      buildId: fixture.build.id,
    });
    invariant(comment);
    const mentions = await CommentMention.query().where({
      commentId: comment.id,
    });
    expect(mentions).toHaveLength(0);
    // No mention notification (only the author is subscribed, and they're excluded).
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test("returns an error if the user cannot review", async ({ fixture }) => {
    const outsiderAccount = await factory.UserAccount.create();
    await outsiderAccount.$fetchGraph("user");
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: getAccountUser(outsiderAccount), account: outsiderAccount },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: commentBody("Hello"),
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors[0].message).toBe("You cannot comment on this build");
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });

  test("anchors a comment to a whole screenshot diff", async ({ fixture }) => {
    const diff = await factory.ScreenshotDiff.create({
      buildId: fixture.build.id,
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            screenshotDiffId: diff.id,
            body: commentBody("This screenshot looks off."),
          },
        },
      });

    expectNoGraphQLError(res);
    const comments = res.body.data.addBuildComment.comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].screenshotDiff.id).toBe(diff.id);
    expect(comments[0].anchor).toBeNull();

    const stored = await Comment.query().findOne({ buildId: fixture.build.id });
    invariant(stored);
    expect(stored.screenshotDiffId).toBe(diff.id);
    expect(stored.anchor).toBeNull();
  });

  test("anchors a comment to a point on a screenshot diff", async ({
    fixture,
  }) => {
    const diff = await factory.ScreenshotDiff.create({
      buildId: fixture.build.id,
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            screenshotDiffId: diff.id,
            anchor: { point: { side: "compare", x: 0.42, y: 0.18 } },
            body: commentBody("This button is misaligned."),
          },
        },
      });

    expectNoGraphQLError(res);
    const { anchor } = res.body.data.addBuildComment.comments[0];
    expect(anchor).toEqual({
      __typename: "CommentPointAnchor",
      side: "compare",
      x: 0.42,
      y: 0.18,
    });

    const stored = await Comment.query().findOne({ buildId: fixture.build.id });
    invariant(stored);
    expect(stored.anchor).toEqual({
      type: "point",
      side: "compare",
      x: 0.42,
      y: 0.18,
    });
  });

  test("anchors a comment to a line range on a snapshot", async ({
    fixture,
  }) => {
    const diff = await factory.ScreenshotDiff.create({
      buildId: fixture.build.id,
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            screenshotDiffId: diff.id,
            anchor: { lines: { from: 12, to: 18 } },
            body: commentBody("These lines changed unexpectedly."),
          },
        },
      });

    expectNoGraphQLError(res);
    const { anchor } = res.body.data.addBuildComment.comments[0];
    expect(anchor).toEqual({
      __typename: "CommentLinesAnchor",
      from: 12,
      to: 18,
    });

    const stored = await Comment.query().findOne({ buildId: fixture.build.id });
    invariant(stored);
    expect(stored.anchor).toEqual({ type: "lines", from: 12, to: 18 });
  });

  test("rejects an anchor on a reply", async ({ fixture }) => {
    invariant(fixture.userAccount.userId);
    const diff = await factory.ScreenshotDiff.create({
      buildId: fixture.build.id,
    });
    const rootComment = await factory.Comment.create({
      buildId: fixture.build.id,
      userId: fixture.userAccount.userId,
      content: commentBody("Root"),
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            threadId: formatCommentId(rootComment.id),
            screenshotDiffId: diff.id,
            body: commentBody("Reply"),
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "A reply cannot be anchored to a screenshot diff",
    );
    const replies = await Comment.query().where({ threadId: rootComment.id });
    expect(replies).toHaveLength(0);
  });

  test("rejects an anchor on a diff from another build", async ({
    fixture,
  }) => {
    const otherBuild = await factory.Build.create({
      projectId: fixture.project.id,
    });
    const diff = await factory.ScreenshotDiff.create({
      buildId: otherBuild.id,
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            screenshotDiffId: diff.id,
            body: commentBody("Wrong build"),
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Screenshot diff not found");
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });

  test("rejects an anchor without a screenshot diff", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            anchor: { point: { side: "compare", x: 0.5, y: 0.5 } },
            body: commentBody("No diff"),
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "A screenshot diff is required to anchor a comment",
    );
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });

  test("rejects an out-of-range point anchor", async ({ fixture }) => {
    const diff = await factory.ScreenshotDiff.create({
      buildId: fixture.build.id,
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            screenshotDiffId: diff.id,
            anchor: { point: { side: "compare", x: 1.5, y: 0.5 } },
            body: commentBody("Out of range"),
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "Comment anchor coordinates must be between 0 and 1",
    );
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });

  test("rejects providing both point and lines anchors", async ({
    fixture,
  }) => {
    const diff = await factory.ScreenshotDiff.create({
      buildId: fixture.build.id,
    });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: getAccountUser(fixture.userAccount),
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ANCHORED_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            screenshotDiffId: diff.id,
            anchor: {
              point: { side: "compare", x: 0.5, y: 0.5 },
              lines: { from: 1, to: 2 },
            },
            body: commentBody("Both"),
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "A comment anchor must set exactly one of point or lines",
    );
    const comments = await Comment.query().where({ buildId: fixture.build.id });
    expect(comments).toHaveLength(0);
  });
});
