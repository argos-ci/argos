import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, expect } from "vitest";

import { formatCommentId } from "@/comment/id";
import { Comment, Project, type Account, type Build } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const RESOLVE_MUTATION = `
  mutation ResolveCommentThread($input: ResolveCommentThreadInput!) {
    resolveCommentThread(input: $input) {
      id
      resolvedAt
    }
  }
`;

const UNRESOLVE_MUTATION = `
  mutation UnresolveCommentThread($input: UnresolveCommentThreadInput!) {
    unresolveCommentThread(input: $input) {
      id
      resolvedAt
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
    /** A team member with the `review` permission on the project. */
    reviewerAccount: Account;
    project: Project;
    build: Build;
    /** Root comment of the thread. */
    comment: Comment;
    /** A reply in the same thread. */
    reply: Comment;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [reviewerAccount, teamAccount] = await Promise.all([
      factory.UserAccount.create(),
      factory.TeamAccount.create(),
    ]);
    invariant(teamAccount.teamId);
    invariant(reviewerAccount.userId);
    const [project] = await Promise.all([
      factory.Project.create({ accountId: teamAccount.id }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: reviewerAccount.userId,
        userLevel: "member",
      }),
      reviewerAccount.$fetchGraph("user"),
    ]);
    const build = await factory.Build.create({ projectId: project.id });
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: reviewerAccount.userId,
      content: commentBody("Root"),
    });
    const reply = await factory.Comment.create({
      buildId: build.id,
      userId: reviewerAccount.userId,
      threadId: comment.id,
      content: commentBody("Reply"),
    });
    await use({ reviewerAccount, project, build, comment, reply });
  },
});

function appForReviewer(fixture: Fixtures["fixture"]) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, {
    user: fixture.reviewerAccount.user!,
    account: fixture.reviewerAccount,
  });
}

test("resolves a thread", async ({ fixture }) => {
  const app = await appForReviewer(fixture);
  const res = await request(app)
    .post("/graphql")
    .send({
      query: RESOLVE_MUTATION,
      variables: { input: { commentId: formatCommentId(fixture.comment.id) } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);
  expect(res.body.data.resolveCommentThread.resolvedAt).not.toBeNull();

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.resolvedAt).not.toBeNull();
});

test("reopens a resolved thread", async ({ fixture }) => {
  await fixture.comment
    .$query()
    .patch({ resolvedAt: new Date().toISOString() });

  const app = await appForReviewer(fixture);
  const res = await request(app)
    .post("/graphql")
    .send({
      query: UNRESOLVE_MUTATION,
      variables: { input: { commentId: formatCommentId(fixture.comment.id) } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);
  expect(res.body.data.unresolveCommentThread.resolvedAt).toBeNull();

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.resolvedAt).toBeNull();
});

test("resolving is idempotent", async ({ fixture }) => {
  const resolvedAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
  await fixture.comment.$query().patch({ resolvedAt });

  const app = await appForReviewer(fixture);
  const res = await request(app)
    .post("/graphql")
    .send({
      query: RESOLVE_MUTATION,
      variables: { input: { commentId: formatCommentId(fixture.comment.id) } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);

  // The original resolvedAt is preserved (no error, no overwrite).
  const stored = await Comment.query().findById(fixture.comment.id);
  expect(new Date(stored!.resolvedAt!).toISOString()).toBe(resolvedAt);
});

test("resolving from a reply resolves the whole thread", async ({
  fixture,
}) => {
  const app = await appForReviewer(fixture);
  const res = await request(app)
    .post("/graphql")
    .send({
      query: RESOLVE_MUTATION,
      variables: { input: { commentId: formatCommentId(fixture.reply.id) } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);
  // The returned comment is the root, not the reply.
  expect(res.body.data.resolveCommentThread.id).toBe(
    formatCommentId(fixture.comment.id),
  );

  const root = await Comment.query().findById(fixture.comment.id);
  const reply = await Comment.query().findById(fixture.reply.id);
  expect(root!.resolvedAt).not.toBeNull();
  // The flag lives only on the root; replies stay untouched.
  expect(reply!.resolvedAt).toBeNull();
});

test("forbids a user without review permission", async ({ fixture }) => {
  const outsiderAccount = await factory.UserAccount.create();
  await outsiderAccount.$fetchGraph("user");
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: outsiderAccount.user!,
      account: outsiderAccount,
    },
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: RESOLVE_MUTATION,
      variables: { input: { commentId: formatCommentId(fixture.comment.id) } },
    });

  expect(res.status).toBe(200);
  expect(res.body.errors[0].message).toBe("You cannot access this thread");

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.resolvedAt).toBeNull();
});

test("requires authentication", async ({ fixture }) => {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    null,
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: RESOLVE_MUTATION,
      variables: { input: { commentId: formatCommentId(fixture.comment.id) } },
    });

  expect(res.body.errors).toBeDefined();
  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.resolvedAt).toBeNull();
});
