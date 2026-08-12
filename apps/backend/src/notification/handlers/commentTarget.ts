import { invariant } from "@argos/util/invariant";
import { z } from "zod";

/**
 * Fields describing what a comment was posted on, shared by every comment
 * notification. A comment lives on a build (`buildNumber`, with an optional
 * `buildName`), on a test (`testName`) or on a media (`mediaName`) — see
 * `getCommentTargetNotificationFields`.
 *
 * Each field is individually optional so a workflow queued before tests could be
 * commented on (and therefore carrying only the build fields) still validates.
 * That exactly one target is named is enforced across them by
 * {@link commentNotificationSchema}.
 */
const commentTargetSchema = z.object({
  buildNumber: z.number().nullish(),
  buildName: z.string().nullish(),
  testName: z.string().nullish(),
  mediaName: z.string().nullish(),
});

export type CommentTargetFields = z.infer<typeof commentTargetSchema>;

/** Whether a payload names what the comment was posted on. */
function namesTarget(fields: CommentTargetFields): boolean {
  return (
    fields.buildNumber != null ||
    fields.testName != null ||
    fields.mediaName != null
  );
}

/**
 * Compose the payload schema of a comment notification: the handler's own fields
 * plus the target fields, checked so the payload names a target.
 *
 * The check belongs here rather than in the email template: a payload naming
 * nothing has to be rejected by `sendNotification`, while the workflow row is
 * still being written. Left to `getCommentTargetLabel`, it surfaces instead as a
 * thrown invariant during delivery — a notification job that fails and retries
 * once per recipient, long after the request that caused it.
 */
export function commentNotificationSchema<TShape extends z.ZodRawShape>(
  shape: TShape,
) {
  return commentTargetSchema.extend(shape).refine(namesTarget, {
    message: "A comment notification must name its target",
  });
}

/**
 * Human label for what a comment was posted on, e.g. `build default #42`,
 * `test Header renders` or `checkout.png`. Used in email subjects and copy, so
 * the same sentence reads correctly for every kind of comment.
 */
export function getCommentTargetLabel(fields: CommentTargetFields): string {
  if (fields.buildNumber != null) {
    const build = fields.buildName
      ? `${fields.buildName} #${fields.buildNumber}`
      : `#${fields.buildNumber}`;
    return `build ${build}`;
  }
  if (fields.testName != null) {
    return `test ${fields.testName}`;
  }
  // No noun in front of it: a media's name is a file name, and "media
  // checkout.png" reads like a category nobody uses out loud.
  invariant(fields.mediaName, "A comment notification must name its target");
  return fields.mediaName;
}
