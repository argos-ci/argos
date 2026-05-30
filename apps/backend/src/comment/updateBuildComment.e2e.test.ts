import { beforeEach, describe, expect, test } from "vitest";

import type { Comment } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { updateBuildComment } from "./updateBuildComment";

const body = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Updated" }] },
  ],
};

const it = test.extend<{ comment: Comment }>({
  comment: async ({}, use) => {
    const comment = await factory.Comment.create({
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Original" }] },
        ],
      },
    });
    await use(comment);
  },
});

describe("updateBuildComment", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("updates the content and stamps editedAt", async ({ comment }) => {
    expect(comment.editedAt).toBeNull();

    const updated = await updateBuildComment({ comment, body });

    expect(updated.content).toEqual(body);
    expect(updated.editedAt).not.toBeNull();
  });

  it("rejects an empty comment", async ({ comment }) => {
    await expect(
      updateBuildComment({
        comment,
        body: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    ).rejects.toThrow("Comment cannot be empty");
  });

  it("rejects an invalid comment body", async ({ comment }) => {
    await expect(
      updateBuildComment({
        comment,
        body: { type: "not-a-doc" },
      }),
    ).rejects.toThrow("Invalid comment body");
  });
});
