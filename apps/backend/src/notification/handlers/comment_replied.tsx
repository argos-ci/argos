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
import {
  commentNotificationSchema,
  getCommentTargetLabel,
} from "./commentTarget";

export const handler = defineNotificationHandler({
  type: "comment_replied",
  category: "review",
  schema: commentNotificationSchema({
    accountSlug: z.string(),
    projectName: z.string(),
    commentUrl: z.url(),
    authorName: z.string().nullish(),
    bodyHtml: z.string(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    commentUrl:
      "https://app.argos-ci.com/argos/my-project/builds/42#comment-xf23d",
    authorName: "Jane Doe",
    bodyHtml: "<p>I pushed a fix for the header spacing.</p>",
  },
  email: (props) => {
    const { accountSlug, projectName, commentUrl, authorName, bodyHtml, ctx } =
      props;
    const targetLabel = getCommentTargetLabel(props);
    const author = authorName || "Someone";
    return {
      subject: `[${accountSlug}/${projectName}] New reply on ${targetLabel}`,
      body: (
        <EmailLayout
          preview={`${author} replied to a comment thread on ${targetLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>New reply</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{author}</strong> replied to a comment thread on{" "}
            <Link href={commentUrl}>
              {accountSlug}/{projectName} {targetLabel}
            </Link>
            .
          </Paragraph>
          <CommentBox html={bodyHtml} />
          <Paragraph>
            <Link href={commentUrl}>View the reply on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
