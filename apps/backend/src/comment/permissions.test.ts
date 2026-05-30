import { describe, expect, it } from "vitest";

import type { Comment, User } from "@/database/models";

import { getCommentPermissions } from "./permissions";

const comment = { userId: "1" } as Comment;

describe("getCommentPermissions", () => {
  it("grants edit to the author", () => {
    const user = { id: "1" } as User;
    expect(getCommentPermissions(comment, user)).toEqual(["edit"]);
  });

  it("grants nothing to another user", () => {
    const user = { id: "2" } as User;
    expect(getCommentPermissions(comment, user)).toEqual([]);
  });

  it("grants nothing to an anonymous user", () => {
    expect(getCommentPermissions(comment, null)).toEqual([]);
  });
});
