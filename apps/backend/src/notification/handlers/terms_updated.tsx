import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

/** Formats an ISO date (YYYY-MM-DD) the way the terms themselves spell it out. */
function formatEffectiveDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * Notice that the terms of service and privacy policy changed.
 *
 * Section 28 of the terms promises paid subscriptions at least thirty days'
 * notice before a material change takes effect, so this sits in the `account`
 * category: it is not configurable and reaches every recipient regardless of
 * their notification preferences.
 */
export const handler = defineNotificationHandler({
  type: "terms_updated",
  category: "account",
  schema: z.object({
    /** Date the new terms take effect for existing paid subscriptions, as YYYY-MM-DD. */
    effectiveDate: z.string(),
  }),
  previewData: { effectiveDate: "2026-09-11" },
  email: (props) => {
    const effectiveDate = formatEffectiveDate(props.effectiveDate);
    return {
      subject: "Updated terms of service and privacy policy",
      body: (
        <EmailLayout preview="Our terms of service and privacy policy have been updated">
          <H1>Updated terms of service and privacy policy</H1>
          <Hi name={props.ctx.user.name} />
          <Paragraph>
            We have rewritten our terms of service and privacy policy. They now
            properly name Smooth Code SAS, the company behind Argos, and they
            are governed by French law rather than the terms we started out with
            years ago.
          </Paragraph>
          <Paragraph>
            The privacy policy also publishes the full list of subprocessors
            that handle your data, so you can see exactly where your screenshots
            are stored and who touches them.
          </Paragraph>
          <Paragraph>
            The new terms take effect on {effectiveDate} for existing paid
            subscriptions, and immediately for everyone else. Nothing changes in
            how you use Argos and there is nothing you need to do. If you would
            rather not accept them, you can cancel before that date and we will
            refund the unused part of your billing period.
          </Paragraph>
          <Paragraph>
            <Link href="https://argos-ci.com/terms">Terms of service</Link>
            {" · "}
            <Link href="https://argos-ci.com/privacy">Privacy policy</Link>
          </Paragraph>
          <Paragraph>Any question, just reply to this message.</Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
