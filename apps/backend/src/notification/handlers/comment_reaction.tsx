import { z } from "zod";

import {
  CommentBox,
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
} from "../../email/components";
import {
  defineNotificationHandler,
  REVIEW_ACTIVITY_BATCH,
} from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "comment_reaction",
  category: "review",
  batch: REVIEW_ACTIVITY_BATCH,
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    commentUrl: z.url(),
    /** Author of the reacted-to comment; used to say "your comment" to them. */
    commentAuthorId: z.string(),
    reactorName: z.string().nullish(),
    emoji: z.string(),
    bodyHtml: z.string(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    commentUrl:
      "https://app.argos-ci.com/argos/my-project/builds/42#comment-xf23d",
    commentAuthorId: "preview-user",
    reactorName: "Jane Doe",
    emoji: "👍",
    bodyHtml: "<p>Could you double-check the header spacing?</p>",
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      commentUrl,
      commentAuthorId,
      reactorName,
      emoji,
      bodyHtml,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const reactor = reactorName || "Someone";
    // The notification goes to every thread subscriber, but only its author
    // owns the reacted-to comment.
    const commentRef =
      ctx.user.id === commentAuthorId ? "your comment" : "a comment";
    return {
      subject: `[${accountSlug}/${projectName}] ${reactor} reacted ${emoji} to ${commentRef}`,
      body: (
        <EmailLayout
          preview={`${reactor} reacted ${emoji} to ${commentRef} on build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>New reaction</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{reactor}</strong> reacted{" "}
            <span style={{ fontSize: "18px" }}>{emoji}</span> to {commentRef} on
            build{" "}
            <Link href={commentUrl}>
              {accountSlug}/{projectName} {buildLabel}
            </Link>
            .
          </Paragraph>
          <CommentBox html={bodyHtml} />
          <Paragraph>
            <Link href={commentUrl}>View the comment on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
