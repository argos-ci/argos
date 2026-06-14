import { z } from "zod";

import { EmailLayout, H1, Hi, Link, Paragraph } from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "review_requested",
  category: "review",
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    buildUrl: z.url(),
    requesterName: z.string().nullish(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    buildUrl: "https://app.argos-ci.com/argos/my-project/builds/42",
    requesterName: "Jane Doe",
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      buildUrl,
      requesterName,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const requester = requesterName || "Someone";
    return {
      subject: `[${accountSlug}/${projectName}] Your review is requested on build ${buildLabel}`,
      body: (
        <EmailLayout
          preview={`${requester} requested your review on build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Review requested</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{requester}</strong> requested your review on build{" "}
            <Link href={buildUrl}>
              {accountSlug}/{projectName} {buildLabel}
            </Link>
            .
          </Paragraph>
          <Paragraph>
            <Link href={buildUrl}>Review the build on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
