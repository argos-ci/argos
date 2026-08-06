import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import { formatCommentId } from "@/comment/id";
import {
  Account,
  Comment,
  CommentMention,
  CommentNotificationSubscription,
  Project,
  Test as TestModel,
  TestNotificationSubscription,
} from "@/database/models";
import { subscribeUserToCommentThread } from "@/database/services/comment-notification-subscription";
import {
  subscribeUserToTest,
  unsubscribeUserFromTest,
} from "@/database/services/test-notification-subscription";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";
import { formatTestId } from "@/util/test-id";

import { expectNoGraphQLError } from "../testing";
import { createGraphQLApp } from "./util";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

const MUTATION = `
  mutation AddTestComment($input: AddTestCommentInput!) {
    addTestComment(input: $input) {
      id
      subscribed
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

const SUBSCRIBE_MUTATION = `
  mutation SubscribeToTest($input: SubscribeToTestInput!) {
    subscribeToTest(input: $input) {
      id
      subscribed
    }
  }
`;

const UNSUBSCRIBE_MUTATION = `
  mutation UnsubscribeFromTest($input: UnsubscribeFromTestInput!) {
    unsubscribeFromTest(input: $input) {
      id
      subscribed
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
          { type: "mention", attrs: { id: account.id, label: account.slug } },
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
    test: TestModel;
    /** Public GraphQL id of the test. */
    testId: string;
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
    const testModel = await factory.Test.create({ projectId: project.id });
    await use({
      userAccount,
      teamAccount,
      project,
      test: testModel,
      testId: formatTestId({
        projectName: project.name,
        testId: testModel.id,
      }),
    });
  },
});

describe("GraphQL addTestComment mutation", () => {
  beforeEach(() => {
    mockSendNotification.mockReset();
  });

  test("posts a comment on a test", async ({ fixture }) => {
    const userId = getAccountUserId(fixture.userAccount);
    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const body = commentBody("This one is flaky on Firefox.");
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: { input: { testId: fixture.testId, body } },
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);

    const comments = res.body.data.addTestComment.comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual(body);
    expect(comments[0].threadId).toBeNull();
    expect(comments[0].threadSubscribed).toBe(true);
    expect(comments[0].user.id).toBe(fixture.userAccount.id);

    const stored = await Comment.query().where({ testId: fixture.test.id });
    expect(stored).toHaveLength(1);
    const storedComment = stored.at(0);
    invariant(storedComment);
    // A test comment carries no build, no review and no snapshot anchor.
    expect(storedComment.buildId).toBeNull();
    expect(storedComment.buildReviewId).toBeNull();
    expect(storedComment.screenshotDiffId).toBeNull();
    expect(storedComment.threadId).toBeNull();
    expect(storedComment.userId).toBe(userId);

    // The author is auto-subscribed to the comment thread.
    const threadSubscription =
      await CommentNotificationSubscription.query().findOne({
        commentId: storedComment.id,
        userId,
      });
    expect(threadSubscription?.isSubscribed()).toBe(true);

    // …and to the test itself, like commenting on a build does.
    expect(res.body.data.addTestComment.subscribed).toBe(true);
    const testSubscription = await TestNotificationSubscription.query().findOne(
      { testId: fixture.test.id, userId },
    );
    expect(testSubscription?.isSubscribed()).toBe(true);
  });

  test("notifies the test subscribers", async ({ fixture }) => {
    invariant(fixture.teamAccount.teamId);
    const subscriberAccount = await factory.UserAccount.create();
    await subscriberAccount.$fetchGraph("user");
    const subscriberUserId = getAccountUserId(subscriberAccount);
    await factory.TeamUser.create({
      teamId: fixture.teamAccount.teamId,
      userId: subscriberUserId,
      userLevel: "member",
    });
    await subscribeUserToTest({
      testId: fixture.test.id,
      userId: subscriberUserId,
    });

    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            testId: fixture.testId,
            body: commentBody("Still flaky, worth a look."),
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

  // A test is followed for as long as it exists, so a subscription long outlives
  // the access that created it. The email carries the comment body, so losing
  // access has to stop the notifications.
  test("does not notify a subscriber who lost project access", async ({
    fixture,
  }) => {
    const outsiderAccount = await factory.UserAccount.create();
    await outsiderAccount.$fetchGraph("user");
    await subscribeUserToTest({
      testId: fixture.test.id,
      userId: getAccountUserId(outsiderAccount),
    });

    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            testId: fixture.testId,
            body: commentBody("Only the team should hear about this."),
          },
        },
      });

    expectNoGraphQLError(res);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test("does not re-subscribe an author who opted out", async ({ fixture }) => {
    const userId = getAccountUserId(fixture.userAccount);
    await unsubscribeUserFromTest({ testId: fixture.test.id, userId });

    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: { testId: fixture.testId, body: commentBody("One more note") },
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.addTestComment.subscribed).toBe(false);
    const subscription = await TestNotificationSubscription.query().findOne({
      testId: fixture.test.id,
      userId,
    });
    expect(subscription?.isSubscribed()).toBe(false);
  });

  test("subscribes and unsubscribes from a test", async ({ fixture }) => {
    const userId = getAccountUserId(fixture.userAccount);
    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });

    const subscribeRes = await request(app)
      .post("/graphql")
      .send({
        query: SUBSCRIBE_MUTATION,
        variables: { input: { testId: fixture.testId } },
      });
    expectNoGraphQLError(subscribeRes);
    expect(subscribeRes.body.data.subscribeToTest.subscribed).toBe(true);

    const unsubscribeRes = await request(app)
      .post("/graphql")
      .send({
        query: UNSUBSCRIBE_MUTATION,
        variables: { input: { testId: fixture.testId } },
      });
    expectNoGraphQLError(unsubscribeRes);
    expect(unsubscribeRes.body.data.unsubscribeFromTest.subscribed).toBe(false);

    const subscription = await TestNotificationSubscription.query().findOne({
      testId: fixture.test.id,
      userId,
    });
    expect(subscription?.isSubscribed()).toBe(false);
  });

  test("posts a reply and notifies the thread subscribers", async ({
    fixture,
  }) => {
    const userId = getAccountUserId(fixture.userAccount);
    const rootComment = await factory.TestComment.create({
      testId: fixture.test.id,
      userId,
      content: commentBody("Anyone looking at this?"),
    });
    invariant(fixture.teamAccount.teamId);
    const subscriberAccount = await factory.UserAccount.create();
    await subscriberAccount.$fetchGraph("user");
    const subscriberUserId = getAccountUserId(subscriberAccount);
    await factory.TeamUser.create({
      teamId: fixture.teamAccount.teamId,
      userId: subscriberUserId,
      userLevel: "member",
    });
    await subscribeUserToCommentThread({
      commentId: rootComment.id,
      userId: subscriberUserId,
    });

    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const body = commentBody("Yes, ignoring it for now.");
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            testId: fixture.testId,
            threadId: formatCommentId(rootComment.id),
            body,
          },
        },
      });

    expectNoGraphQLError(res);
    const storedReply = await Comment.query().findOne({
      testId: fixture.test.id,
      threadId: rootComment.id,
    });
    invariant(storedReply);
    expect(storedReply.content).toEqual(body);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.type).toBe("comment_replied");
    expect(call.recipients).toEqual([subscriberUserId]);
  });

  test("records and notifies a mentioned team member", async ({ fixture }) => {
    invariant(fixture.teamAccount.teamId);
    const mentionedAccount = await factory.UserAccount.create();
    await mentionedAccount.$fetchGraph("user");
    const mentionedUserId = getAccountUserId(mentionedAccount);
    await factory.TeamUser.create({
      teamId: fixture.teamAccount.teamId,
      userId: mentionedUserId,
      userLevel: "member",
    });

    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            testId: fixture.testId,
            body: mentionBody(mentionedAccount),
          },
        },
      });

    expectNoGraphQLError(res);

    const comment = await Comment.query().findOne({ testId: fixture.test.id });
    invariant(comment);

    const mentions = await CommentMention.query().where({
      commentId: comment.id,
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.mentionedUserId).toBe(mentionedUserId);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.type).toBe("comment_mention");
    expect(call.recipients).toEqual([mentionedUserId]);
    // The notification names the test, not a build.
    expect(call.data).toMatchObject({ testName: fixture.test.name });
    expect(call.data).not.toHaveProperty("buildNumber");
  });

  test("returns an error if the user cannot review", async ({ fixture }) => {
    const outsiderAccount = await factory.UserAccount.create();
    await outsiderAccount.$fetchGraph("user");
    const app = createGraphQLApp({
      user: getAccountUser(outsiderAccount),
      account: outsiderAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: { testId: fixture.testId, body: commentBody("Hello") },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors[0].message).toBe("You cannot comment on this test");
    const comments = await Comment.query().where({ testId: fixture.test.id });
    expect(comments).toHaveLength(0);
  });

  test("returns not found for a test addressed through another project", async ({
    fixture,
  }) => {
    const otherProject = await factory.Project.create({
      accountId: fixture.teamAccount.id,
      name: "another-project",
    });
    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            testId: formatTestId({
              projectName: otherProject.name,
              testId: fixture.test.id,
            }),
            body: commentBody("Wrong project"),
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Test not found");
    const comments = await Comment.query().where({ testId: fixture.test.id });
    expect(comments).toHaveLength(0);
  });

  test("rejects an empty comment", async ({ fixture }) => {
    const app = createGraphQLApp({
      user: getAccountUser(fixture.userAccount),
      account: fixture.userAccount,
    });
    const res = await request(app)
      .post("/graphql")
      .send({
        query: MUTATION,
        variables: {
          input: {
            testId: fixture.testId,
            body: { type: "doc", content: [{ type: "paragraph" }] },
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Comment cannot be empty");
    const comments = await Comment.query().where({ testId: fixture.test.id });
    expect(comments).toHaveLength(0);
  });
});
