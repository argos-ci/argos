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
  type: "comment_added",
  category: "review",
  batch: REVIEW_ACTIVITY_BATCH,
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
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
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      commentUrl,
      authorName,
      bodyHtml,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const author = authorName || "Someone";
    return {
      subject: `[${accountSlug}/${projectName}] New comment on build ${buildLabel}`,
      body: (
        <EmailLayout
          preview={`${author} commented on build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>New comment</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{author}</strong> commented on build{" "}
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
