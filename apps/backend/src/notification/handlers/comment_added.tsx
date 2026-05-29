import { z } from "zod";

import { EmailLayout, H1, Hi, Link, Paragraph } from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "comment_added",
  category: "review",
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    buildUrl: z.url(),
    authorName: z.string().nullish(),
    bodyHtml: z.string(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    buildUrl: "https://app.argos-ci.com/argos/my-project/builds/42",
    authorName: "Jane Doe",
    bodyHtml: "<p>Could you double-check the header spacing?</p>",
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      buildUrl,
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
            <Link href={buildUrl}>
              {accountSlug}/{projectName} {buildLabel}
            </Link>
            .
          </Paragraph>
          <div
            className="my-4 rounded bg-[#f6f6f6] p-4 text-sm text-gray-950"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          <Paragraph>
            <Link href={buildUrl}>View the build on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
