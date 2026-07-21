import { z } from "zod";

import config from "@/config";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

const baseUrl = config.get("server.url");

export const handler = defineNotificationHandler({
  type: "trial_ended",
  // Announcing a charge is transactional: "account" is a non-configurable
  // category, so recipients can't opt out of it and the email carries no
  // preferences link.
  category: "account",
  schema: z.object({
    accountName: z.string().nullish(),
    accountSlug: z.string(),
    planName: z.string(),
    includedScreenshots: z.number(),
  }),
  previewData: {
    accountName: "Argos",
    accountSlug: "argos",
    planName: "Pro",
    includedScreenshots: 15000,
  },
  email: (props) => {
    const { planName, includedScreenshots, ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    const settingsHref = new URL(`/${props.accountSlug}/settings`, baseUrl)
      .href;
    const includedLabel = includedScreenshots.toLocaleString("en-US");
    return {
      subject: `Your ${planName} trial has ended`,
      body: (
        <EmailLayout
          preview={`${accountName} used all the screenshots included in its trial, the ${planName} plan has started.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Your trial has ended</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            Your team, <strong>{accountName}</strong>, has used all of the{" "}
            {includedLabel} screenshots included in its {planName} trial.
            Because a payment method is on file, the trial has ended and the{" "}
            {planName} plan has started, so your builds keep running.
          </Paragraph>
          <Paragraph>
            <strong>
              Your payment method will be charged for the {planName} plan.
            </strong>{" "}
            A new billing period has started, with {includedLabel} screenshots
            included. Screenshots beyond that are billed at your plan rate.
          </Paragraph>
          <Paragraph>
            The screenshots you took during the trial are not billed.
          </Paragraph>
          <Paragraph>
            You can review your usage and set a spend limit from your{" "}
            <Link href={settingsHref}>team settings</Link>.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
