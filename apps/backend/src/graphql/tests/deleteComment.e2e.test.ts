import request from "supertest";
import { test as base, expect } from "vitest";

import { formatCommentId } from "@/comment/id";
import { Comment, type Account, type Build } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const MUTATION = `
  mutation DeleteComment($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      id
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
    authorAccount: Account;
    build: Build;
    comment: Comment;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const authorAccount = await factory.UserAccount.create();
    await authorAccount.$fetchGraph("user");
    const build = await factory.Build.create();
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: authorAccount.userId!,
      content: commentBody("Original"),
    });
    await use({ authorAccount, build, comment });
  },
});

test("lets the author delete the comment", async ({ fixture }) => {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: fixture.authorAccount.user!,
      account: fixture.authorAccount,
    },
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: MUTATION,
      variables: { input: { id: formatCommentId(fixture.comment.id) } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.deletedAt).not.toBeNull();
});

test("is idempotent when the comment is already deleted", async ({
  fixture,
}) => {
  await fixture.comment.$query().patch({ deletedAt: new Date().toISOString() });
  const deletedAt = new Date(
    (await Comment.query().findById(fixture.comment.id))!.deletedAt!,
  ).toISOString();

  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: fixture.authorAccount.user!,
      account: fixture.authorAccount,
    },
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: MUTATION,
      variables: { input: { id: formatCommentId(fixture.comment.id) } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);

  // The original deletedAt is preserved (no error, no overwrite).
  const stored = await Comment.query().findById(fixture.comment.id);
  expect(new Date(stored!.deletedAt!).toISOString()).toBe(deletedAt);
});

test("forbids a non-author from deleting the comment", async ({ fixture }) => {
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
      query: MUTATION,
      variables: { input: { id: formatCommentId(fixture.comment.id) } },
    });

  expect(res.status).toBe(200);
  expect(res.body.errors[0].message).toBe("You cannot delete this comment");

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.deletedAt).toBeNull();
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
      query: MUTATION,
      variables: { input: { id: formatCommentId(fixture.comment.id) } },
    });

  expect(res.body.errors).toBeDefined();
  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.deletedAt).toBeNull();
});

test("returns a clean error for a malformed comment ID", async ({
  fixture,
}) => {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: fixture.authorAccount.user!,
      account: fixture.authorAccount,
    },
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: MUTATION,
      variables: { input: { id: "not-a-comment-id" } },
    });

  expect(res.status).toBe(200);
  expect(res.body.errors[0].message).toBe("Comment not found");
});
