import { assertNever } from "@argos/util/assertNever";
import { z } from "zod";

import { EmailLayout, H1, Hi, Link, Paragraph } from "../../email/components";
import {
  defineNotificationHandler,
  REVIEW_ACTIVITY_BATCH,
} from "../workflow-types";

const reviewStateSchema = z.enum(["approved", "rejected", "commented"]);

type ReviewState = z.infer<typeof reviewStateSchema>;

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
  type: "review_dismissed",
  category: "review",
  batch: REVIEW_ACTIVITY_BATCH,
  schema: z.object({
    accountSlug: z.string(),
    projectName: z.string(),
    buildNumber: z.number(),
    buildName: z.string().nullish(),
    buildUrl: z.url(),
    dismissedByName: z.string().nullish(),
    state: reviewStateSchema,
  }),
  previewData: {
    accountSlug: "argos",
    projectName: "my-project",
    buildNumber: 42,
    buildName: "default",
    buildUrl: "https://app.argos-ci.com/argos/my-project/builds/42",
    dismissedByName: "Jane Doe",
    state: "approved",
  },
  email: (props) => {
    const {
      accountSlug,
      projectName,
      buildNumber,
      buildName,
      buildUrl,
      dismissedByName,
      state,
      ctx,
    } = props;
    const buildLabel = buildName
      ? `${buildName} #${buildNumber}`
      : `#${buildNumber}`;
    const dismisser = dismissedByName || "Someone";
    const reviewLabel = getReviewLabel(state);
    return {
      subject: `[${accountSlug}/${projectName}] Your review on build ${buildLabel} was dismissed`,
      body: (
        <EmailLayout
          preview={`${dismisser} dismissed your ${reviewLabel} on build ${buildLabel}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Review dismissed</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            <strong>{dismisser}</strong> dismissed your {reviewLabel} on build{" "}
            <Link href={buildUrl}>
              {accountSlug}/{projectName} {buildLabel}
            </Link>
            .
          </Paragraph>
          <Paragraph>
            <Link href={buildUrl}>View the build on Argos →</Link>
          </Paragraph>
        </EmailLayout>
      ),
    };
  },
});
