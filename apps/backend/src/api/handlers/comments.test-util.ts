import type { Express } from "express";

import { Project, User, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

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

/**
 * An app serving every comment endpoint. Each is registered on both its build
 * and its test path, so one app covers both suites.
 */
export function createCommentApiApp(): Express {
  return createTestHandlerApp((ctx) => {
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
}

/** A minimal rich-text comment document carrying one line of text. */
export function commentDoc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/** Bearer header for a personal access token. */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export type CommentApiFixtures = {
  /** Owner of `project`, and the caller `scopedPatToken` authenticates as. */
  user: User;
  /** A user with no access to `project`, for the permission cases. */
  otherUser: User;
  /** `acme/web`, owned by a team `user` owns. */
  project: Project;
  /** A personal access token of `user`, scoped to `project`'s account. */
  scopedPatToken: string;
};

type Use<T> = (value: T) => Promise<void>;

/**
 * The world the comment API suites share: one project, its owner, an outsider,
 * and a token scoped to the project's account.
 *
 * Pass to `test.extend` and chain a second `extend` for whatever the suite hangs
 * comments off — a build, or a test. The `extend` stays in the test file so the
 * lint rules that only apply to test files still see `test` for what it is.
 *
 * The parameters are destructured (and typed) rather than taken whole because
 * vitest reads the destructuring pattern to work out which fixtures each one
 * depends on.
 */
export const commentApiFixtures = {
  user: async (
    // eslint-disable-next-line no-empty-pattern -- an empty pattern declares no fixture dependencies.
    {}: object,
    use: Use<User>,
  ) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  otherUser: async ({ user }: { user: User }, use: Use<User>) => {
    // Depends on `user` so the database is set up first.
    void user;
    const otherUser = await factory.User.create();
    await factory.UserAccount.create({ userId: otherUser.id });
    await use(otherUser);
  },
  project: async ({ user }: { user: User }, use: Use<Project>) => {
    const [, teamAccount] = await Promise.all([
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
  },
  scopedPatToken: async (
    { user, project }: { user: User; project: Project },
    use: Use<string>,
  ) => {
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
};
