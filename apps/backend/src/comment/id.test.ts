import { describe, expect, it } from "vitest";

import { formatCommentId, parseCommentId } from "./id";

describe("comment ID helpers", () => {
  it("formats a comment ID with the comment- prefix", () => {
    expect(formatCommentId("123")).toMatch(/^comment-/);
  });

  it("round-trips a numberish comment ID", () => {
    expect(parseCommentId(formatCommentId("123"))).toBe("123");
  });

  it("throws when parsing an ID without the comment- prefix", () => {
    expect(() => parseCommentId("123")).toThrow("Invalid comment ID format");
  });

  it("throws when parsing an invalid sqids payload", () => {
    expect(() => parseCommentId("comment-")).toThrow(
      "Invalid comment ID format",
    );
  });
});
