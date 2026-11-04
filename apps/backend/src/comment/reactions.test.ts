import { describe, expect, it } from "vitest";

import type { CommentReaction } from "@/database/models";

import { groupCommentReactions } from "./reactions";

describe("groupCommentReactions", () => {
  function reaction(emoji: string, userId: string): CommentReaction {
    return { emoji, userId, commentId: "1" } as CommentReaction;
  }

  it("returns an empty array for no reactions", () => {
    expect(groupCommentReactions([])).toEqual([]);
  });

  it("groups reactions by emoji preserving first-seen order", () => {
    const groups = groupCommentReactions([
      reaction("👍", "1"),
      reaction("🎉", "2"),
      reaction("👍", "3"),
    ]);
    expect(groups).toEqual([
      { emoji: "👍", userIds: ["1", "3"] },
      { emoji: "🎉", userIds: ["2"] },
    ]);
  });
});
