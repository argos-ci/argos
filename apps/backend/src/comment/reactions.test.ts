import { describe, expect, it } from "vitest";

import type { CommentReaction } from "@/database/models";

import { groupCommentReactions, isValidEmoji } from "./reactions";

describe("isValidEmoji", () => {
  it("accepts a simple emoji", () => {
    expect(isValidEmoji("👍")).toBe(true);
  });

  it("accepts an emoji with a skin-tone modifier", () => {
    expect(isValidEmoji("👍🏽")).toBe(true);
  });

  it("accepts a ZWJ sequence", () => {
    expect(isValidEmoji("👨‍👩‍👧‍👦")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(isValidEmoji("lgtm")).toBe(false);
  });

  it("rejects digits", () => {
    expect(isValidEmoji("123")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidEmoji("")).toBe(false);
  });

  it("rejects an emoji with trailing text", () => {
    expect(isValidEmoji("👍lgtm")).toBe(false);
  });

  it("rejects multiple emojis", () => {
    expect(isValidEmoji("👍🎉")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidEmoji(undefined)).toBe(false);
    expect(isValidEmoji(42)).toBe(false);
  });
});

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
