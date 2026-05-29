import { assertNever } from "@argos/util/assertNever";
import { z } from "zod";

import { EmailLayout, H1, Hi, Link, Paragraph } from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

const reviewStateSchema = z.enum(["approved", "rejected", "commented"]);

type ReviewState = z.infer<typeof reviewStateSchema>;

function getActionLabel(state: ReviewState): string {
  switch (state) {
    case "approved":
      return "approved";
    case "rejected":
      return "requested changes on";
    case "commented":
      return "commented on";
    default:
      assertNever(state);
  }
}

function getSubjectLabel(state: ReviewState): string {
  switch (state) {
    case "approved":
      return "approved";
    case "rejected":
      return "changes requested";
    case "commented":
      return "new comment";
    default:
      assertNever(state);
  }
}

export const handler = defineNotificationHandler({
  type: "review_submitted",
  category: "review",
  configurable: true,
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    buildUrl: z.url(),
    reviewerName: z.string().nullish(),
    state: reviewStateSchema,
    bodyHtml: z.string().nullish(),
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    buildUrl: "https://app.argos-ci.com/argos/my-project/builds/42",
    reviewerName: "Jane Doe",
    state: "approved",
    bodyHtml: "<p>Looks good to me, thanks!</p>",
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      buildUrl,
      reviewerName,
      state,
      bodyHtml,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const reviewer = reviewerName || "Someone";
    const action = getActionLabel(state);
    const subjectLabel = getSubjectLabel(state);
    return {
      subject: `[${accountSlug}/${projectName}] Build ${buildLabel} ${subjectLabel}`,
      body: (
        <EmailLayout
          preview={`${reviewer} ${action} build ${buildLabel} in ${accountSlug}/${projectName}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Review submitted</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{reviewer}</strong> {action} build{" "}
            <Link href={buildUrl}>
              {accountSlug}/{projectName} {buildLabel}
            </Link>
            .
          </Paragraph>
          {bodyHtml ? (
            <div
              className="my-4 rounded bg-[#f6f6f6] p-4 text-sm text-gray-950"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : null}
          <Paragraph>
            <Link href={buildUrl}>View the build on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
