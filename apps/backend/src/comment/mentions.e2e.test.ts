import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { Account, Comment, CommentMention } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  getCommentMentionLabels,
  getMentionableUserIds,
  syncCommentMentions,
} from "./mentions";

function mentionDoc(accountIds: string[]) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hey " },
          ...accountIds.map((id) => ({
            type: "mention",
            attrs: { id },
          })),
        ],
      },
    ],
  };
}

describe("getMentionableUserIds", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("includes team owners and members but not bare contributors", async () => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const [owner, member, contributor] = await Promise.all([
      factory.User.create(),
      factory.User.create(),
      factory.User.create(),
    ]);
    await Promise.all([
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: owner.id,
        userLevel: "owner",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: member.id,
        userLevel: "member",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: contributor.id,
        userLevel: "contributor",
      }),
    ]);

    const userIds = await getMentionableUserIds(project);
    expect([...userIds].sort()).toEqual([owner.id, member.id].sort());
  });

  it("includes contributors that have explicit project access", async () => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const contributor = await factory.User.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: contributor.id,
      userLevel: "contributor",
    });
    await factory.ProjectUser.create({
      projectId: project.id,
      userId: contributor.id,
      userLevel: "viewer",
    });

    const userIds = await getMentionableUserIds(project);
    expect(userIds).toEqual([contributor.id]);
  });
});

describe("syncCommentMentions", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function setup() {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const build = await factory.Build.create({ projectId: project.id });
    const memberAccount = await factory.UserAccount.create();
    invariant(memberAccount.userId);
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: memberAccount.userId,
      userLevel: "member",
    });
    return { project, build, memberAccount };
  }

  it("records a mention for a user with access", async () => {
    const { project, build, memberAccount } = await setup();
    const comment = await factory.Comment.create({
      buildId: build.id,
      content: mentionDoc([memberAccount.id]),
    });

    const mentionedUserIds = await syncCommentMentions({ comment, project });
    expect(mentionedUserIds).toEqual([memberAccount.userId]);

    const rows = await CommentMention.query().where({ commentId: comment.id });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("user");
    expect(rows[0]?.mentionedUserId).toBe(memberAccount.userId);
  });

  it("drops a mention of a user without project access", async () => {
    const { project, build } = await setup();
    // An account that doesn't belong to the project's team.
    const outsider = await factory.UserAccount.create();
    const comment = await factory.Comment.create({
      buildId: build.id,
      content: mentionDoc([outsider.id]),
    });

    const mentionedUserIds = await syncCommentMentions({ comment, project });
    expect(mentionedUserIds).toEqual([]);
    const rows = await CommentMention.query().where({ commentId: comment.id });
    expect(rows).toHaveLength(0);
  });

  it("removes mentions that disappear from edited content", async () => {
    const { project, build, memberAccount } = await setup();
    const comment = await factory.Comment.create({
      buildId: build.id,
      content: mentionDoc([memberAccount.id]),
    });
    await syncCommentMentions({ comment, project });

    // Re-sync after the mention was removed from the content.
    await comment.$query().patch({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "never mind" }],
          },
        ],
      },
    });
    const refreshed = await Comment.query().findById(comment.id);
    invariant(refreshed);
    const mentionedUserIds = await syncCommentMentions({
      comment: refreshed,
      project,
    });
    expect(mentionedUserIds).toEqual([]);
    const rows = await CommentMention.query().where({ commentId: comment.id });
    expect(rows).toHaveLength(0);
  });

  it("ignores account ids that are not user accounts", async () => {
    const { project, build } = await setup();
    // Mention the team account id (not a user account) — must be dropped.
    const teamAccount = await Account.query().findById(project.accountId);
    invariant(teamAccount);
    const comment = await factory.Comment.create({
      buildId: build.id,
      content: mentionDoc([teamAccount.id]),
    });
    const mentionedUserIds = await syncCommentMentions({ comment, project });
    expect(mentionedUserIds).toEqual([]);
  });
});

describe("getCommentMentionLabels", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("maps the mentioned account id to its display name", async () => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const build = await factory.Build.create({ projectId: project.id });
    const memberAccount = await factory.UserAccount.create({ name: "Alice" });
    invariant(memberAccount.userId);
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: memberAccount.userId,
      userLevel: "member",
    });
    const comment = await factory.Comment.create({
      buildId: build.id,
      content: mentionDoc([memberAccount.id]),
    });
    await syncCommentMentions({ comment, project });

    const labels = await getCommentMentionLabels(comment.id);
    // Keyed by the account id stored in the mention node (not the user id).
    expect(labels.get(memberAccount.id)).toBe("Alice");
    expect(labels.size).toBe(1);
  });

  it("returns an empty map when there are no mentions", async () => {
    const build = await factory.Build.create();
    const comment = await factory.Comment.create({ buildId: build.id });
    const labels = await getCommentMentionLabels(comment.id);
    expect(labels.size).toBe(0);
  });
});
