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

export const handler = defineNotificationHandler({
  type: "comment_mention",
  category: "review",
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
    bodyHtml: "<p>Hey, can you take a look at this one?</p>",
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
      subject: `[${accountSlug}/${projectName}] ${author} mentioned you on build ${buildLabel}`,
      body: (
        <EmailLayout
          preview={`${author} mentioned you on build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>You were mentioned</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{author}</strong> mentioned you on build{" "}
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
