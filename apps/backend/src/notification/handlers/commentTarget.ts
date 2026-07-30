import { invariant } from "@argos/util/invariant";
import { z } from "zod";

/**
 * Fields describing what a comment was posted on, shared by every comment
 * notification. A comment lives either on a build (`buildNumber`, with an
 * optional `buildName`) or on a test (`testName`) — exactly one is set, see
 * `getCommentTargetNotificationFields`.
 *
 * They are all optional so a workflow queued before tests could be commented on
 * (and therefore carrying only the build fields) still validates.
 */
export const commentTargetSchema = {
  buildNumber: z.number().nullish(),
  buildName: z.string().nullish(),
  testName: z.string().nullish(),
};

export type CommentTargetFields = {
  buildNumber?: number | null | undefined;
  buildName?: string | null | undefined;
  testName?: string | null | undefined;
};

/**
 * Human label for what a comment was posted on, e.g. `build default #42` or
 * `test Header renders`. Used in email subjects and copy, so the same sentence
 * reads correctly for both kinds of comment.
 */
export function getCommentTargetLabel(fields: CommentTargetFields): string {
  if (fields.buildNumber != null) {
    const build = fields.buildName
      ? `${fields.buildName} #${fields.buildNumber}`
      : `#${fields.buildNumber}`;
    return `build ${build}`;
  }
  invariant(fields.testName, "A comment notification must name its target");
  return `test ${fields.testName}`;
}
