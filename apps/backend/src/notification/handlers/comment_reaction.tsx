import { z } from "zod";

import { EmailLayout, H1, Hi, Link, Paragraph } from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "comment_reaction",
  category: "review",
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    commentUrl: z.url(),
    reactorName: z.string().nullish(),
    emoji: z.string(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    commentUrl:
      "https://app.argos-ci.com/argos/my-project/builds/42#comment-xf23d",
    reactorName: "Jane Doe",
    emoji: "👍",
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      commentUrl,
      reactorName,
      emoji,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const reactor = reactorName || "Someone";
    return {
      subject: `[${accountSlug}/${projectName}] ${reactor} reacted ${emoji} to your comment`,
      body: (
        <EmailLayout
          preview={`${reactor} reacted ${emoji} to your comment on build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>New reaction</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{reactor}</strong> reacted{" "}
            <span style={{ fontSize: "18px" }}>{emoji}</span> to your comment on
            build{" "}
            <Link href={commentUrl}>
              {accountSlug}/{projectName} {buildLabel}
            </Link>
            .
          </Paragraph>
          <Paragraph>
            <Link href={commentUrl}>View the comment on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
