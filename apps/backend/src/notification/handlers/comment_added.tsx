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
  type: "comment_added",
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
    bodyHtml: "<p>Could you double-check the header spacing?</p>",
  },
  email: (props) => {
    const { accountSlug, projectName, commentUrl, authorName, bodyHtml, ctx } =
      props;
    const targetLabel = getCommentTargetLabel(props);
    const author = authorName || "Someone";
    return {
      subject: `[${accountSlug}/${projectName}] New comment on ${targetLabel}`,
      body: (
        <EmailLayout
          preview={`${author} commented on ${targetLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>New comment</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{author}</strong> commented on{" "}
            <Link href={commentUrl}>
              {accountSlug}/{projectName} {targetLabel}
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
