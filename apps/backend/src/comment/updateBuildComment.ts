import type { JSONContent } from "@tiptap/core";

import type { Comment } from "@/database/models";
import { boom } from "@/util/error";

import { isCommentEmpty, validateCommentJson } from "./validate";

/**
 * Update the content of an existing build comment and stamp its `editedAt`
 * date so consumers can tell it has been edited.
 */
export async function updateBuildComment(input: {
  comment: Comment;
  body: JSONContent;
}): Promise<Comment> {
  const { comment, body } = input;

  if (!validateCommentJson(body)) {
    throw boom(400, "Invalid comment body");
  }

  if (isCommentEmpty(body)) {
    throw boom(400, "Comment cannot be empty");
  }

  return comment.$query().patchAndFetch({
    content: body,
    editedAt: new Date().toISOString(),
  });
}
