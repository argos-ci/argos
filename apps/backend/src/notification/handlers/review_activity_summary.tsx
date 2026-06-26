import { Fragment } from "react";
import { assertNever } from "@argos/util/assertNever";
import { z } from "zod";

import {
  CommentBox,
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

/** Activity types rolled up into a review-activity digest. */
const activityTypeSchema = z.enum([
  "comment_added",
  "comment_replied",
  "comment_reaction",
  "review_submitted",
  "review_dismissed",
]);

const reviewStateSchema = z.enum(["approved", "rejected", "commented"]);

const activitySchema = z.object({
  type: activityTypeSchema,
  /** Display name of whoever performed the action. */
  actorName: z.string().nullish(),
  /** Comment/review body, when the activity carries one. */
  bodyHtml: z.string().nullish(),
  /** Link to the specific comment, for comment activities. */
  commentUrl: z.url().nullish(),
  /** Author of the reacted-to comment, to say "your comment" to them. */
  commentAuthorId: z.string().nullish(),
  /** Emoji, for reaction activities. */
  emoji: z.string().nullish(),
  /** Review state, for review activities. */
  state: reviewStateSchema.nullish(),
  occurredAt: z.string(),
});

type Activity = z.infer<typeof activitySchema>;
type ReviewState = z.infer<typeof reviewStateSchema>;

/**
 * Turn a list of reactor names into a short phrase:
 * "Alice", "Alice and Bob", "Alice, Bob, and Carol", "Alice, Bob, and 3 others".
 */
function formatReactorNames(names: string[]): string {
  switch (names.length) {
    case 0:
      return "Someone";
    case 1:
      return names[0]!;
    case 2:
      return `${names[0]} and ${names[1]}`;
    case 3:
      return `${names[0]}, ${names[1]}, and ${names[2]}`;
    default:
      return `${names[0]}, ${names[1]}, and ${names.length - 2} others`;
  }
}

type ReactionGroup = {
  emoji: string;
  commentUrl: string | null;
  commentRef: string;
  names: string;
};

/**
 * Aggregate repeated reactions so the digest shows one line per
 * emoji + comment rather than one line per reactor.
 */
function groupReactions(
  reactions: Activity[],
  recipientUserId: string,
): ReactionGroup[] {
  const groups = new Map<
    string,
    {
      emoji: string;
      commentUrl: string | null;
      isOwnComment: boolean;
      names: string[];
    }
  >();
  for (const reaction of reactions) {
    const emoji = reaction.emoji ?? "👍";
    const commentUrl = reaction.commentUrl ?? null;
    const key = `${emoji}|${commentUrl ?? ""}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        emoji,
        commentUrl,
        isOwnComment: reaction.commentAuthorId === recipientUserId,
        names: [],
      };
      groups.set(key, group);
    }
    group.names.push(reaction.actorName || "Someone");
  }
  return Array.from(groups.values()).map((group) => ({
    emoji: group.emoji,
    commentUrl: group.commentUrl,
    commentRef: group.isOwnComment ? "your comment" : "a comment",
    names: formatReactorNames(group.names),
  }));
}

/** Sentence describing a non-reaction activity. */
function getActivityAction(activity: Activity): string {
  switch (activity.type) {
    case "comment_added":
      return "commented";
    case "comment_replied":
      return "replied to a thread";
    case "review_submitted":
      return getReviewAction(activity.state ?? "commented");
    case "review_dismissed":
      return `dismissed their ${getReviewLabel(activity.state ?? "commented")}`;
    case "comment_reaction":
      // Reactions are rendered separately via groupReactions.
      return "reacted";
    default:
      assertNever(activity.type);
  }
}

function getReviewAction(state: ReviewState): string {
  switch (state) {
    case "approved":
      return "approved this build";
    case "rejected":
      return "requested changes";
    case "commented":
      return "left a review comment";
    default:
      assertNever(state);
  }
}

function getReviewLabel(state: ReviewState): string {
  switch (state) {
    case "approved":
      return "approval";
    case "rejected":
      return "change request";
    case "commented":
      return "comment";
    default:
      assertNever(state);
  }
}

export const handler = defineNotificationHandler({
  type: "review_activity_summary",
  category: "review",
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    buildUrl: z.url(),
    activities: z.array(activitySchema),
    /** Total events in the batch, including any not shown. */
    totalCount: z.number(),
    /** Events beyond the display cap. */
    omittedCount: z.number(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    buildUrl: "https://app.argos-ci.com/argos/my-project/builds/42",
    activities: [
      {
        type: "review_submitted",
        actorName: "Jane Doe",
        state: "rejected",
        bodyHtml: "<p>Could you double-check the header spacing?</p>",
        occurredAt: "2026-06-26T10:00:00.000Z",
      },
      {
        type: "comment_replied",
        actorName: "John Smith",
        bodyHtml: "<p>Good catch, pushing a fix now.</p>",
        commentUrl:
          "https://app.argos-ci.com/argos/my-project/builds/42#comment-xf23d",
        occurredAt: "2026-06-26T10:05:00.000Z",
      },
      {
        type: "comment_reaction",
        actorName: "Jane Doe",
        emoji: "👍",
        commentUrl:
          "https://app.argos-ci.com/argos/my-project/builds/42#comment-xf23d",
        commentAuthorId: "preview-user",
        occurredAt: "2026-06-26T10:06:00.000Z",
      },
      {
        type: "comment_reaction",
        actorName: "Bob",
        emoji: "👍",
        commentUrl:
          "https://app.argos-ci.com/argos/my-project/builds/42#comment-xf23d",
        commentAuthorId: "preview-user",
        occurredAt: "2026-06-26T10:07:00.000Z",
      },
    ],
    totalCount: 4,
    omittedCount: 0,
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      buildUrl,
      activities,
      totalCount,
      omittedCount,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const buildRef = `${accountSlug}/${projectName} ${buildLabel}`;
    const subject =
      totalCount > 1
        ? `[${accountSlug}/${projectName}] ${totalCount} new updates on build ${buildLabel}`
        : `[${accountSlug}/${projectName}] New review activity on build ${buildLabel}`;

    // Reactions aggregate into one line per emoji/comment; everything else is
    // listed in the order it happened.
    const reactions = activities.filter((a) => a.type === "comment_reaction");
    const items = activities.filter((a) => a.type !== "comment_reaction");
    const reactionGroups = groupReactions(reactions, ctx.user.id);

    return {
      subject,
      body: (
        <EmailLayout
          preview={`${totalCount} new ${totalCount === 1 ? "update" : "updates"} on build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Review activity</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            Here's a summary of recent activity on build{" "}
            <Link href={buildUrl}>{buildRef}</Link>.
          </Paragraph>
          {items.map((activity, index) => {
            const actor = activity.actorName || "Someone";
            const action = getActivityAction(activity);
            const href = activity.commentUrl ?? buildUrl;
            return (
              <Fragment key={`item-${index}`}>
                <Paragraph>
                  <strong>{actor}</strong> <Link href={href}>{action}</Link>.
                </Paragraph>
                {activity.bodyHtml ? (
                  <CommentBox html={activity.bodyHtml} />
                ) : null}
              </Fragment>
            );
          })}
          {reactionGroups.map((group, index) => (
            <Paragraph key={`reaction-${index}`}>
              <strong>{group.names}</strong> reacted{" "}
              <span style={{ fontSize: "18px" }}>{group.emoji}</span> to{" "}
              {group.commentUrl ? (
                <Link href={group.commentUrl}>{group.commentRef}</Link>
              ) : (
                group.commentRef
              )}
              .
            </Paragraph>
          ))}
          {omittedCount > 0 ? (
            <Paragraph>
              And {omittedCount} more{" "}
              {omittedCount === 1 ? "update" : "updates"}.
            </Paragraph>
          ) : null}
          <Paragraph>
            <Link href={buildUrl}>View the build on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
