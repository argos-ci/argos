import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import { concludeBuild } from "@/build/concludeBuild";
import {
  Account,
  Build,
  BuildReview,
  Comment,
  Project,
  ScreenshotDiff,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

vi.mock("@/notification", () => ({ sendNotification: vi.fn() }));
const mockSendNotification = vi.mocked(sendNotification);

const ADD_COMMENT = `
  mutation AddBuildComment($input: AddBuildCommentInput!) {
    addBuildComment(input: $input) {
      id
      comments {
        id
        pending
      }
    }
  }
`;

const CREATE_REVIEW = `
  mutation CreateBuildReview($input: CreateBuildReviewInput!) {
    createBuildReview(input: $input) {
      status
    }
  }
`;

const BUILD_COMMENTS = `
  query BuildComments(
    $accountSlug: String!
    $projectName: String!
    $buildNumber: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      build(number: $buildNumber) {
        viewerHasSubmittedReview
        comments {
          id
          pending
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

type Fixtures = {
  fixture: {
    author: Account;
    member: Account;
    teamAccount: Account;
    project: Project;
    build: Build;
    screenshotDiffs: ScreenshotDiff[];
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [author, member, teamAccount] = await Promise.all([
      factory.UserAccount.create(),
      factory.UserAccount.create(),
      factory.TeamAccount.create(),
    ]);
    invariant(teamAccount.teamId && author.userId && member.userId);
    const [project] = await Promise.all([
      factory.Project.create({ accountId: teamAccount.id }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: author.userId,
        userLevel: "owner",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: member.userId,
        userLevel: "member",
      }),
      author.$fetchGraph("user"),
      member.$fetchGraph("user"),
      teamAccount.$fetchGraph("team"),
    ]);
    const build = await factory.Build.create({
      projectId: project.id,
      conclusion: null,
    });
    const screenshots = await factory.Screenshot.createMany(2);
    const screenshotDiffs = await factory.ScreenshotDiff.createMany(1, [
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[1]!.id,
        score: 0.3,
      },
    ]);
    await concludeBuild({ build, notify: false });
    const freshBuild = await build.$query();
    await use({
      author,
      member,
      teamAccount,
      project,
      build: freshBuild,
      screenshotDiffs,
    });
  },
});

describe("pending review comments", () => {
  beforeEach(() => {
    mockSendNotification.mockReset();
  });

  test("addToReview creates a pending review and a pending comment without notifying", async ({
    fixture,
  }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.author.user!, account: fixture.author },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ADD_COMMENT,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: commentBody("Drafting feedback"),
            addToReview: true,
          },
        },
      });
    expectNoGraphQLError(res);
    expect(res.body.data.addBuildComment.comments).toHaveLength(1);
    expect(res.body.data.addBuildComment.comments[0].pending).toBe(true);

    const review = await BuildReview.query().findOne({
      buildId: fixture.build.id,
      userId: fixture.author.userId,
    });
    invariant(review);
    expect(review.state).toBe("pending");

    const comment = await Comment.query().findOne({
      buildId: fixture.build.id,
    });
    invariant(comment);
    expect(comment.buildReviewId).toBe(review.id);

    // Draft comments don't notify anyone.
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test("a pending comment is visible to its author but hidden from other members", async ({
    fixture,
  }) => {
    const authorApp = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.author.user!, account: fixture.author },
    );
    await request(authorApp)
      .post("/graphql")
      .send({
        query: ADD_COMMENT,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: commentBody("Only I should see this"),
            addToReview: true,
          },
        },
      });

    const variables = {
      accountSlug: fixture.teamAccount.slug,
      projectName: fixture.project.name,
      buildNumber: fixture.build.number,
    };

    const authorView = await request(authorApp)
      .post("/graphql")
      .send({ query: BUILD_COMMENTS, variables });
    expectNoGraphQLError(authorView);
    expect(authorView.body.data.project.build.comments).toHaveLength(1);
    expect(authorView.body.data.project.build.comments[0].pending).toBe(true);
    expect(authorView.body.data.project.build.viewerHasSubmittedReview).toBe(
      false,
    );

    const memberApp = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.member.user!, account: fixture.member },
    );
    const memberView = await request(memberApp)
      .post("/graphql")
      .send({ query: BUILD_COMMENTS, variables });
    expectNoGraphQLError(memberView);
    expect(memberView.body.data.project.build.comments).toHaveLength(0);
  });

  test("submitting the review reuses the pending review, makes its comments live and notifies mentions", async ({
    fixture,
  }) => {
    const authorApp = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.author.user!, account: fixture.author },
    );
    // Draft a comment that mentions another member.
    await request(authorApp)
      .post("/graphql")
      .send({
        query: ADD_COMMENT,
        variables: {
          input: {
            buildId: fixture.build.id,
            body: mentionBody(fixture.member),
            addToReview: true,
          },
        },
      });
    // No notification while the comment is a draft.
    expect(mockSendNotification).not.toHaveBeenCalled();

    const submit = await request(authorApp)
      .post("/graphql")
      .send({
        query: CREATE_REVIEW,
        variables: {
          input: {
            buildId: fixture.build.id,
            event: "COMMENT",
            screenshotDiffReviews: [],
          },
        },
      });
    expectNoGraphQLError(submit);

    // The pending review is reused (transitioned), not duplicated.
    const reviews = await BuildReview.query().where({
      buildId: fixture.build.id,
      userId: fixture.author.userId,
    });
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.state).toBe("commented");

    // The mention is now notified (deferred until the comment went live).
    const mentionCalls = mockSendNotification.mock.calls.filter(
      (call) => call[0]?.type === "comment_mention",
    );
    expect(mentionCalls).toHaveLength(1);
    expect(mentionCalls[0]![0].recipients).toEqual([fixture.member.userId]);

    // The comment is now visible to the other member.
    const memberApp = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.member.user!, account: fixture.member },
    );
    const memberView = await request(memberApp)
      .post("/graphql")
      .send({
        query: BUILD_COMMENTS,
        variables: {
          accountSlug: fixture.teamAccount.slug,
          projectName: fixture.project.name,
          buildNumber: fixture.build.number,
        },
      });
    expectNoGraphQLError(memberView);
    expect(memberView.body.data.project.build.comments).toHaveLength(1);
    expect(memberView.body.data.project.build.comments[0].pending).toBe(false);
  });

  test("addToReview falls back to a standalone comment when the build is not reviewable", async ({
    fixture,
  }) => {
    // A build with no diffs concludes as "no-changes" — there's nothing to
    // review, so a draft would be stranded.
    const unreviewable = await factory.Build.create({
      projectId: fixture.project.id,
      conclusion: null,
    });
    await concludeBuild({ build: unreviewable, notify: false });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: fixture.author.user!, account: fixture.author },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ADD_COMMENT,
        variables: {
          input: {
            buildId: unreviewable.id,
            body: commentBody("Heads up"),
            addToReview: true,
          },
        },
      });
    expectNoGraphQLError(res);
    // Posted immediately (not a draft), and no pending review was created.
    expect(res.body.data.addBuildComment.comments).toHaveLength(1);
    expect(res.body.data.addBuildComment.comments[0].pending).toBe(false);
    const reviews = await BuildReview.query().where({
      buildId: unreviewable.id,
    });
    expect(reviews).toHaveLength(0);
    const comment = await Comment.query().findOne({ buildId: unreviewable.id });
    invariant(comment);
    expect(comment.buildReviewId).toBeNull();
  });
});
