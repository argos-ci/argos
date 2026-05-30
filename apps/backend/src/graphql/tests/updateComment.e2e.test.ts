import request from "supertest";
import { test as base, expect } from "vitest";

import { formatCommentId } from "@/comment/id";
import { Comment, type Account, type Build } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const MUTATION = `
  mutation UpdateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      id
      content
      editedAt
      permissions
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

test("lets the author edit the comment", async ({ fixture }) => {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: fixture.authorAccount.user!,
      account: fixture.authorAccount,
    },
  );
  const body = commentBody("Edited content");
  const res = await request(app)
    .post("/graphql")
    .send({
      query: MUTATION,
      variables: { input: { id: formatCommentId(fixture.comment.id), body } },
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);

  const updated = res.body.data.updateComment;
  expect(updated.content).toEqual(body);
  expect(updated.editedAt).not.toBeNull();
  expect(updated.permissions).toEqual(["edit"]);

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.content).toEqual(body);
  expect(stored!.editedAt).not.toBeNull();
});

test("forbids a non-author from editing the comment", async ({ fixture }) => {
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
      variables: {
        input: {
          id: formatCommentId(fixture.comment.id),
          body: commentBody("Hacked"),
        },
      },
    });

  expect(res.status).toBe(200);
  expect(res.body.errors[0].message).toBe("You cannot edit this comment");

  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.content).toEqual(commentBody("Original"));
  expect(stored!.editedAt).toBeNull();
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
      variables: {
        input: {
          id: formatCommentId(fixture.comment.id),
          body: commentBody("Anon"),
        },
      },
    });

  expect(res.body.errors).toBeDefined();
  const stored = await Comment.query().findById(fixture.comment.id);
  expect(stored!.editedAt).toBeNull();
});
