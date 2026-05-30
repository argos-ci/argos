import request from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import {
  Account,
  Build,
  BuildNotificationSubscription,
  Comment,
  Project,
} from "@/database/models";
import { subscribeUserToBuild } from "@/database/services/build-notification-subscription";
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
        user {
          id
        }
      }
    }
  }
`;

function commentBody(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
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
    const [project] = await Promise.all([
      factory.Project.create({ accountId: teamAccount.id }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId!,
        userId: userAccount.userId!,
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
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.userAccount.user!, account: fixture.userAccount },
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
    expect(comments[0].user.id).toBe(fixture.userAccount.id);

    const stored = await Comment.query().where({ buildId: fixture.build.id });
    expect(stored).toHaveLength(1);
    expect(stored[0]!.buildReviewId).toBeNull();
    expect(stored[0]!.userId).toBe(fixture.userAccount.userId);

    // The author is auto-subscribed to the build.
    const subscription = await BuildNotificationSubscription.query().findOne({
      buildId: fixture.build.id,
      userId: fixture.userAccount.userId!,
    });
    expect(subscription?.isSubscribed()).toBe(true);
  });

  test("notifies the build subscribers", async ({ fixture }) => {
    const subscriberAccount = await factory.UserAccount.create();
    await subscriberAccount.$fetchGraph("user");
    await subscribeUserToBuild({
      buildId: fixture.build.id,
      userId: subscriberAccount.userId!,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.userAccount.user!, account: fixture.userAccount },
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
    const call = mockSendNotification.mock.calls[0]![0];
    expect(call.type).toBe("comment_added");
    // The author is excluded, the subscriber is notified.
    expect(call.recipients).toEqual([subscriberAccount.userId]);
  });

  test("rejects an invalid comment body", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.userAccount.user!, account: fixture.userAccount },
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
      { user: fixture.userAccount.user!, account: fixture.userAccount },
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

  test("returns an error if the user cannot review", async ({ fixture }) => {
    const outsiderAccount = await factory.UserAccount.create();
    await outsiderAccount.$fetchGraph("user");
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: outsiderAccount.user!, account: outsiderAccount },
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
});
